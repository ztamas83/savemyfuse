"""Advanced current calculations"""

import numpy
from math import trunc

SAFETY_MARGIN = 1


class Calculator:
    """Target current calculator"""

    def __init__(self, logger, rated_current: float = 0) -> None:
        self._rated_current = rated_current
        self._logger = logger

    def _running_mean(self, samples, window_size) -> float:
        """Running mean calculator"""
        # https://stackoverflow.com/questions/13728392/moving-average-or-running-mean

        valid_window = min(window_size, len(samples))
        if not valid_window:
            return 0

        cumsum = numpy.cumsum(numpy.insert(samples, 0, 0))
        return (cumsum[valid_window:] - cumsum[:-valid_window]) / float(valid_window)

    def _get_new_current(self, calc_load: float) -> int:
        return max(0, self._rated_current - trunc(calc_load) - SAFETY_MARGIN)

    def calculate_target_current(self, current_load: float) -> int:
        """Provides the target current as a simple operation"""

        return self._get_new_current(current_load)

    def calculate_target_with_filter(self, phase_data) -> int:
        """Provides the target current run through a mean filter"""

        running_mean = self._running_mean(
            phase_data.samples,
            6,  # windows size 6 => 5x6 seconds, 30 sec
        )

        return self._get_new_current(running_mean[-1])
