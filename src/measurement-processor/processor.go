package processor

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	cloudevents "github.com/cloudevents/sdk-go/v2"

	"cloud.google.com/go/firestore"
	"cloud.google.com/go/pubsub"
	"github.com/GoogleCloudPlatform/functions-framework-go/functions"
)

type PubSubMessage struct {
	Data []byte `json:"data"`
}

type IncomingMeasurement struct {
    EntityID     string                 `json:"entity_id"`
    State        string                 `json:"state"`
    Attributes   CharginAttributes `json:"attributes"`
    LastChanged  time.Time              `json:"last_changed"`
    LastReported time.Time              `json:"last_reported"`
    LastUpdated  time.Time              `json:"last_updated"`
    Context      Context                `json:"context"`
}

type CharginAttributes struct {
	  TotalL1 float64 `json:"total_l1"`
		TotalL2 float64 `json:"total_l2"`
		TotalL3 float64 `json:"total_l3"`
		ChargerL1 float64 `json:"charger_l1"`
		ChargerL2 float64 `json:"charger_l2"`
		ChargerL3 float64 `json:"charger_l3"`
		friendly_name string `json:"friendly_name"`
}

type Context struct {
    ID       string  `json:"id"`
    ParentID *string `json:"parent_id"`
    UserID   *string `json:"user_id"`
}

// Define the structure for the data you will store in Firestore
type DbData struct {
	CalculatedValue int       `firestore:"calculatedValue"`
	ProcessedTime   time.Time `firestore:"processedTime"`
}

var (
	firestoreClient *firestore.Client
	pubsubClient    *pubsub.Client
	autoDetectProjectId       string
	outputTopicID   = "your-output-topic" // Replace with your actual output topic ID
)

func init() {
	// Use the GOOGLE_CLOUD_PROJECT environment variable provided by Cloud Functions
	autoDetectProjectId = "savemyfuse" // Replace or fetch from environment variable

	ctx := context.Background()

	// Initialize Firestore Client
	var err error
	// firestoreClient, err = firestore.NewClient(ctx, autoDetectProjectId)
	// if err != nil {
	// 	log.Fatalf("firestore.NewClient: %v", err)
	// }

	// Initialize Pub/Sub Client
	pubsubClient, err = pubsub.NewClient(ctx, autoDetectProjectId)
	if err != nil {
		log.Fatalf("pubsub.NewClient: %v", err)
	}

	// Register the function
	functions.CloudEvent("PubSubProcessor", PubSubProcessor)
}

// PubSubProcessor is the entry point for the Cloud Function.
func PubSubProcessor(ctx context.Context, m cloudevents.Event) error {
	// 1. Decode Pub/Sub Message
		
	log.Printf("Received Pub/Sub message: %s", m.String())	
	var input IncomingMeasurement
	if err := json.Unmarshal([]byte(string(m.Data())), &input); err != nil {
		
		return fmt.Errorf("json.Unmarshal: %w", err) // Return error for retry
	}
	
	log.Printf("Processing measurement, reported: %s", input.LastReported.String())

	// 2. Perform Calculation
	// calculatedValue := input.Value * 10
	// log.Printf("Calculated value: %d", calculatedValue)

	// 3. Persist in Firestore
	// record := Record{
	// 	CalculatedValue: calculatedValue,
	// 	ProcessedTime:   time.Now(),
	// }

	// docRef := firestoreClient.Collection("processed_records").Doc(input.ID)
	// _, err := docRef.Set(ctx, record)
	// if err != nil {
	// 	log.Printf("Error writing to Firestore: %v", err)
	// 	return fmt.Errorf("firestore write: %w", err) // Return error for retry
	// }
	// log.Printf("Successfully wrote to Firestore document: %s", input.ID)

	// 4. Publish Command on Pub/Sub
	// outputCommand := OutputCommand{
	// 	RecordID: input.ID,
	// 	Status:   "processed",
	// }

	// outputPayload, err := json.Marshal(outputCommand)
	// if err != nil {
	// 	log.Printf("Error marshalling output command: %v", err)
	// 	// Don't return an error here, as the main work is done. Log and proceed.
	// }

	// result := pubsubClient.Topic(outputTopicID).Publish(ctx, &pubsub.Message{
	// 	Data: outputPayload,
	// })

	// if _, err := result.Get(ctx); err != nil {
	// 	log.Printf("Error publishing to Pub/Sub topic %s: %v", outputTopicID, err)
	// 	return fmt.Errorf("pubsub publish: %w", err) // Return error for retry
	// }

	// log.Printf("Successfully published command to topic: %s", outputTopicID)

	return nil
}
