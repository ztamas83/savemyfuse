import base64
from cloudevents.http import CloudEvent
from google.cloud.firestore import AsyncClient as FsClient
import functions_framework
from pyeasee import Easee, STATUS
import os
import asyncio
from dotenv import load_dotenv
from loadbalancer.phase import ElectricalPhase
import json
from functools import lru_cache

load_dotenv()

"""Generic charge controller constants"""
DATA_HASS_CONFIG = "generic_charger_hass_config"
DOMAIN = "generic_charge_controller"

DEFAULT_TARGET_CURRENT = 16

PHASE_TMP = "P%s"
PHASE1 = "P1"
PHASE2 = "P2"
PHASE3 = "P3"

CONF_PHASE1 = "phase1"
CONF_PHASE2 = "phase2"
CONF_PHASE3 = "phase3"
CONF_ENTITYID_POWER_NOW = "charger_power_sensor"
CONF_RATED_CURRENT = "mains_fuse_current"
CONF_CHRG_ID = "charger_device_id"

ATTR_LIMIT_Px = "Current limit %s"

client: Easee = None


# @lru_cache(maxsize=5, typed=True)
async def fetch_phase_data(
    dbClient: FsClient, location_id: str
) -> dict[str, ElectricalPhase]:
    db = FsClient()
    data_ref = db.collection("measurements").document(location_id)
    snapshot = await data_ref.get()
    if snapshot.exists:
        phases = {}
        for phase_id in [PHASE1, PHASE2, PHASE3]:
            try:
                phase_data = snapshot.get(phase_id)
                if phase_data is None:
                    continue

                phases[phase_id] = ElectricalPhase(
                    phase_id,
                    phase_data["mapped_phase"],
                    phase_data["target_current"],
                    phase_data["samples"],
                )
            except KeyError:
                pass
        return phases
    else:
        phases = {
            PHASE1: ElectricalPhase(
                PHASE1, os.environ.get(CONF_PHASE1, "l1"), DEFAULT_TARGET_CURRENT
            )
        }
        if os.environ.get("PHASE2"):
            phases[PHASE2] = ElectricalPhase(
                PHASE2, os.environ.get(CONF_PHASE2), DEFAULT_TARGET_CURRENT
            )
        if os.environ.get("PHASE3"):
            phases[PHASE3] = ElectricalPhase(
                PHASE3, os.environ.get(CONF_PHASE3), DEFAULT_TARGET_CURRENT
            )

        await save_phase_data(dbClient, location_id, phases)
        return phases


async def save_phase_data(
    dbClient: FsClient, location_id: str, phases: dict[str, ElectricalPhase]
) -> None:
    data_ref = dbClient.collection("measurements").document(location_id)
    await data_ref.set({phase_id: vars(phases[phase_id]) for phase_id in phases.keys()})


async def subscribe(cloud_event: CloudEvent) -> None:
    # Print out the data from Pub/Sub, to prove that it worked
    # print(cloud_event)

    event_data = json.loads(
        base64.b64decode(cloud_event.data["message"]["data"]).decode("utf-8")
    )

    # print(event_data)

    # check which phase the data is from

    EASEEUSER = os.environ.get("EASEECLIENTID")
    EASEESECRET = os.environ.get("EASEECLIENTSECRET")

    if not EASEEUSER or not EASEESECRET:
        raise ValueError("EASEECLIENTID and EASEECLIENTSECRET must be set")

    dbClient = FsClient()
    current_data = await fetch_phase_data(dbClient, "brotorpsgatan_31")

    # print(current_data)

    for phase in range(1, 4):  # 1, 2, 3
        available_current = (
            event_data["attributes"][f"total_l{phase}"]
            - event_data["attributes"][f"charger_l{phase}"]
        )
        # print(f"Available current on phase {phase}: {available_current}")
        if current_data.get(PHASE_TMP % phase) is not None:
            current_data[PHASE_TMP % phase].add_sample(available_current)

    await save_phase_data(dbClient, "brotorpsgatan_31", current_data)


@functions_framework.cloud_event
def main(cloud_event: CloudEvent) -> None:
    asyncio.run(subscribe(cloud_event))
