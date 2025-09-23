import collections
import logging
from typing import List
import json


class ElectricalPhase:
    """Holds data for each phase"""

    def __init__(
        self,
        phase_id: str,
        mapped_phase: str,
        target_current: float,
        samples: List[float] = [],
        
    ) -> None:
        self._phase_id = phase_id
        self._mapped_phase = mapped_phase
        self._target_current = target_current
        self._samples = collections.deque(
            samples, 60
        )  # 60 x 5 seconds => 5 minutes of samples

    def __repr__(self) -> str:
        return f"{self.__class__} (-> {self._mapped_phase}), target: {self._target_current}, samples: {self._samples}"

    def __str__(self) -> str:
        return json.dumps(self.__dict__)

    @property
    def __dict__(self):
        return {
            "phase_id": self._phase_id,
            "mapped_phase": self._mapped_phase,
            "target_current": self._target_current,
            "samples": list(self._samples),
        }

    @property
    def phase_id(self):
        """Phase ID"""
        return self._phase_id

    @property
    def mapped_phase(self):
        """Mapped phase"""
        return self._mapped_phase

    @property
    def target_current(self):
        """Target current on the phase"""
        return self._target_current

    @property
    def samples(self) -> collections.deque:
        """Samples"""
        return self._samples
    

    def add_sample(self, measurement: float) -> None:
        self._samples.append(measurement)

    def update_target(self, new_target_current: float) -> None:
        """Sets the target current on the phase"""
        logging.debug(
            "Update target current on phase %s to %s",
            self._phase_id,
            new_target_current,
        )
        self._target_current = new_target_current
