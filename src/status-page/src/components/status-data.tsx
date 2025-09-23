import { useState, useEffect } from "react";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../firebase.client";
import {
  PhaseDataGrid,
  type PhaseDataProps,
} from "~/components/phase-data-grid";

interface LocationData {
  id: string;
  // Add other fields from your measurement documents as needed
  [key: string]: unknown;
}

export default function StatusData() {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [dataToShow, setDataToShow] = useState<PhaseDataProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMeasurements = async () => {
      try {
        const measurementsCollection = collection(db, "measurements");
        const querySnapshot = await getDocs(measurementsCollection);

        const measurementsList: LocationData[] = [];
        querySnapshot.forEach((doc) => {
          measurementsList.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        setLocations(measurementsList);
      } catch (err) {
        setError("Failed to fetch measurements");
        console.error("Error fetching measurements:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMeasurements();
  }, []);

  useEffect(() => {
    if (!selectedLocation) {
      return;
    }

    const data = locations.find((l) => l.id === selectedLocation);

    if (!data) {
      console.log(
        "Should not happen, no data for this location: ",
        selectedLocation
      );
      return;
    }

    setLocationData(data);
    console.log("Selected location data:", data);

    // Exclude 'id' and get all other properties
    const { id, ...phaseProps } = data;

    const propArray: PhaseDataProps[] = [];

    for (const phaseData of Object.values(phaseProps)) {
      if ((phaseData as PhaseDataProps)?.phase_id) {
        propArray.push({
          ...(phaseData as PhaseDataProps),
        });
      }
    }

    propArray.sort((a, b) => a.phase_id.localeCompare(b.phase_id));
    setDataToShow(propArray);
  }, [locations, selectedLocation]);

  if (loading) return <div>Loading measurements...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-4">
      <label
        htmlFor="measurement-select"
        className="block text-sm font-medium mb-2"
      >
        Select Measurement:
      </label>
      <select
        id="measurement-select"
        value={selectedLocation}
        onChange={(e) => setSelectedLocation(e.target.value)}
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">-- Select a measurement --</option>
        {locations.map((measurement) => (
          <option key={measurement.id} value={measurement.id}>
            {measurement.id}
          </option>
        ))}
      </select>
      {locationData && dataToShow.length > 0 && (
        <div>
          <h1>
            Charger updated at:{" "}
            {(locationData.updated_at as Timestamp).toDate().toLocaleString()}
          </h1>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dataToShow.map((phaseData, index) => (
              <PhaseDataGrid key={index} {...phaseData} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
