from cloudevents.http import CloudEvent
from google.cloud.firestore import AsyncClient as FsClient
from google.cloud.logging import Client as LoggingClient
import functions_framework
import os
import asyncio
from dotenv import load_dotenv
from loadbalancer.phase import ElectricalPhase
import json
import logging
from datetime import datetime, timedelta

load_dotenv()

"""Generic charge controller constants"""
DEFAULT_RATED_CURRENT = 16
PHASE_TMP = "P%s"
PHASE1 = "P1"
PHASE2 = "P2"
PHASE3 = "P3"

CONF_PHASES = "CONF_PHASES"
CONF_RATED_CURRENT = "mains_fuse_current"
CONF_CHRG_ID = "charger_device_id"

ATTR_LIMIT_Px = "Current limit %s"

eventLoop = asyncio.new_event_loop()
asyncio.set_event_loop(eventLoop)

staticDbClient = FsClient()
controllers = {}


logger: logging.Logger = logging.getLogger("ChargeController")

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

# Stream handler to log messages in the console.
stream_handler = logging.StreamHandler()
stream_handler.setLevel(logging.DEBUG)

# GCP Logging handler
loggingClient = LoggingClient()
loggingClient.setup_logging(log_level=logging.getLevelName(logger.level))

# Add handlers
# logger.addHandler(stream_handler)


class ChargeController:
    def __init__(
        self,
        dbClient: FsClient,
        location_id: str,
        rated_current: int = DEFAULT_RATED_CURRENT,
    ):
        self.dbClient = dbClient
        self._location_id = location_id
        self._rated_current = rated_current
        self._phases: dict[str, ElectricalPhase] = {}
        self._is_charging = False
        self._current_limits: dict[str, int] = {"l1": None, "l2": None, "l3": None}
        self._limit_last_updated: datetime = datetime.fromtimestamp(0)

    @property
    def is_charging(self) -> bool:
        return self._is_charging

    def get_current_limits(self) -> list[int]:
        return list(self._current_limits.values())

    async def fetch_phase_data(self) -> dict[str, ElectricalPhase]:
        if self._phases:
            logger.debug("Cache hit for phase data")
            return self._phases

        phases: dict[str, ElectricalPhase] = {}

        phase_conf = (
            os.environ.get(CONF_PHASES).split(",")
            if os.environ.get(CONF_PHASES)
            else ["l1"]
        )

        data_ref = self.dbClient.collection("measurements").document(self._location_id)
        snapshot = await data_ref.get()
        if snapshot.exists:
            for i in range(len(phase_conf)):
                phase_id = PHASE_TMP % (i + 1)
                try:
                    phase_data = snapshot.get(phase_id)
                    if phase_data is None:
                        raise KeyError

                    else:
                        phases[phase_id] = ElectricalPhase(
                            phase_id,
                            phase_data["mapped_phase"].lower(),
                            phase_data["target_current"],
                            phase_data["samples"],
                        )
                except KeyError:
                    # If the data is not in the DB but the configuration adds it we add it as new
                    phases[phase_id] = ElectricalPhase(
                        phase_id,
                        phase_conf[i],
                        self._rated_current,
                    )
        else:
            logger.info(f"Phase configuration: {phase_conf}")
            for index, mapped_phase in enumerate(phase_conf):
                phases[PHASE_TMP % (index + 1)] = ElectricalPhase(
                    PHASE_TMP % 1,
                    mapped_phase,
                    self._rated_current,
                )

            await self.save_phase_data()

        self._phases = phases
        return self._phases

    async def update_phase_data(self, event_data) -> None:
        from loadbalancer.calculator import Calculator

        print("Event data", event_data)

        calculator = Calculator(self._rated_current)
        charging_on_phases = 0
        for i in range(1, len(self._phases) + 1):
            src_phase = self._phases[PHASE_TMP % i]
            mapped_phase = src_phase.mapped_phase
            charger_current = event_data["attributes"][
                f"charger_{mapped_phase.lower()}"
            ]

            if charger_current > 0:
                charging_on_phases += 1

            phase_current = event_data["attributes"][f"total_l{i}"]
            # if the HomeAssistant Tibber integration fails for some reason the data will not be available
            if not isinstance(phase_current, (int, float)):
                logger.warning(
                    f"Invalid phase current value for phase {i}, using hard limit 6A"
                )
                self._current_limits[mapped_phase.lower()] = 6
                # send_notification("Invalid phase currents received.", data=event_data)
                continue

            available_current = phase_current - charger_current
            # print(f"Available current on phase {phase}: {available_current}")

            self._phases[PHASE_TMP % i].add_sample(available_current)

            self._current_limits[mapped_phase.lower()] = (
                calculator.calculate_target_with_filter(src_phase)
            )

        logger.debug(
            f"Target calculated {self._current_limits}",
            extra={"json_fields": self._current_limits},
        )

        self._is_charging = charging_on_phases > 0

        await self.save_phase_data()

    async def save_phase_data(self) -> None:
        data_ref = self.dbClient.collection("measurements").document(self._location_id)

        await data_ref.set(
            {phase_id: vars(self._phases[phase_id]) for phase_id in self._phases.keys()}
        )

    async def update_charger(self) -> None:
        # TODO: add update frequency configuration
        logger.debug(
            f"Last update: {self._limit_last_updated.isoformat(timespec='seconds')}"
        )
        if self._limit_last_updated > datetime.now() - timedelta(seconds=45):
            logger.info("Charger updated less than 45 seconds ago, skipping")
            return

        from loadbalancer.easee import EaseeCharger, get_client
        from aiohttp import ClientSession

        # only prepared to handle one charger now
        charger_targets = self.get_current_limits()

        logger.debug(f"Charger targets {charger_targets}")

        try:
            async with ClientSession() as session:
                easee: EaseeCharger = get_client(
                    os.environ.get("EASEE_SITE"),
                    os.environ.get("EASEECLIENTID"),
                    os.environ.get("EASEECLIENTSECRET"),
                    session,
                )
                await easee.init_data()

                await easee.charger.set_dynamic_charger_circuit_current(
                    *charger_targets, timeToLive=2
                )

                self._limit_last_updated = datetime.now()
        except Exception as e:
            logger.error(e)
            logger.error("Failed to update charger", extra={"exception": e})


def check_env_vars():
    if not os.environ.get("EASEECLIENTID") or not os.environ.get("EASEECLIENTSECRET"):
        raise ValueError("EASEECLIENTID and EASEECLIENTSECRET must be set")
    if not os.environ.get("EASEE_SITE"):
        raise ValueError("EASEE_SITE must be set")


async def handle_cloud_event(cloud_event: CloudEvent):
    # Print out the data from Pub/Sub, to prove that it worked

    check_env_vars()

    site_id = os.environ.get("EASEE_SITE")

    logger.debug("Incoming event", extra={"event": cloud_event})
    import base64

    event_data = json.loads(
        base64.b64decode(cloud_event.data["message"]["data"]).decode("utf-8")
    )

    controller = controllers.get(site_id)
    if controller is None:
        controller = ChargeController(staticDbClient, site_id, 16)
        controllers[site_id] = controller

    current_data = await controller.fetch_phase_data()

    try:
        print(current_data["P1"])
        print(current_data["P2"])
        print(current_data["P3"])
    except Exception as e:
        logger.warning("Loging error", e)
        pass

    logger.debug(
        "Phase data fetched",
        extra={"json_fields": current_data.values()},
    )

    await controller.update_phase_data(event_data)

    logger.info("Data updated")

    if not (controller.is_charging or os.environ.get("FORCED_UPDATE")):
        logger.info("Currently not charging, no need to update charger")
        return

    logger.info("Charging or forced update, updating charger")

    await controller.update_charger()


@functions_framework.cloud_event
def main(cloud_event: CloudEvent) -> None:
    eventLoop.run_until_complete(handle_cloud_event(cloud_event))
