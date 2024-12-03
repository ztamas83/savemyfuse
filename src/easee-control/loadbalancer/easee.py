from pyeasee import Easee, Site, Charger, Circuit
from aiocache import cached, Cache
from functools import lru_cache
import logging


class EaseeCharger(Easee):
    def __init__(self, user: str, password: str, location_id):
        super().__init__(user, password)
        self._location_id = location_id
        self._charger: Charger = None

    @property
    def charger(self):
        return self._charger

    async def init_data(self):
        logging.debug("Fetching charger data")
        if self._charger:
            return
        sites: list[Site] = await self.sites()
        circuits: list[Circuit] = sites[0].get_circuits()
        chargers: list[Charger] = circuits[0].get_chargers()

        self._charger = chargers[0]

    @cached(ttl=600, cache=Cache.MEMORY)
    async def sites(self) -> list[Site]:
        return await self.get_sites()


@lru_cache()
def get_client(location_id: str, user: str, password: str):
    return EaseeCharger(user, password, location_id)
