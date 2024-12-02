terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.12.0"
    }
  }
}

locals {
  project = "savemyfuse"
  region  = "europe-north1"
}

provider "google" {
  project     = local.project
  region      = local.region
}

resource "random_id" "default" {
  byte_length = 8
}

# Create a dedicated service account
resource "google_service_account" "eventarc" {
  account_id   = "eventarc-trigger-sa"
  display_name = "Eventarc Trigger Service Account"
}

# Grant permission to receive Eventarc events
resource "google_project_iam_member" "eventreceiver" {
  project = local.project
  role    = "roles/eventarc.eventReceiver"
  member  = "serviceAccount:${google_service_account.eventarc.email}"
}

# Grant permission to invoke Cloud Run services
resource "google_project_iam_member" "runinvoker" {
  project = local.project
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.eventarc.email}"
}

resource "google_service_account" "easee-controller" {
  account_id   = "easee-controller-sa"
  display_name = "Easee Controller Function acc"
}

variable "controller_roles" {
  type = list(string)
  default = [
    "roles/artifactregistry.createOnPushWriter",
    "roles/eventarc.eventReceiver",
    "roles/logging.logWriter",
    "roles/pubsub.subscriber",
    "roles/secretmanager.secretAccessor",
    "roles/storage.objectAdmin",
    "roles/datastore.user"
  ]
}

resource "google_project_iam_member" "controller-role" {
  for_each = toset(var.controller_roles)
  project = local.project
  role    = each.value
  member  = "serviceAccount:${google_service_account.easee-controller.email}"
}

resource "google_storage_bucket" "default" {
  name                        = "${random_id.default.hex}-gcf-source" # Every bucket name must be globally unique
  location                    = "europe-north1"
  uniform_bucket_level_access = true
}

data "archive_file" "easee-source-archive" {
  type        = "zip"
  output_path = "/tmp/function-source.zip"
  source_dir  = "../src/easee-control/"
  excludes = [ ".venv", ".env" ]
}
resource "google_storage_bucket_object" "object" {
  name   = "easee-control-${data.archive_file.easee-source-archive.output_sha256}.zip"
  bucket = google_storage_bucket.default.name
  source = data.archive_file.easee-source-archive.output_path # Add path to the zipped function source code
}

resource "google_firestore_database" "database" {
  project     = local.project
  name        = "(default)"
  location_id = local.region
  type        = "FIRESTORE_NATIVE"
}

resource "google_cloudfunctions2_function" "easee-control-func" {
  name        = "function-easee-control"
  location    = "europe-north1"
  description = "Easee control function"

  build_config {
    runtime     = "python312"
    entry_point = "main" # Set the entry point
    source {
      storage_source {
        bucket = google_storage_bucket.default.name
        object = google_storage_bucket_object.object.name
      }
    }
  }

  service_config {
    max_instance_count = 1
    min_instance_count = 0
    available_memory   = "256M"
    timeout_seconds    = 30
    #max_instance_request_concurrency = 50

    ingress_settings = "ALLOW_INTERNAL_ONLY"

    environment_variables = {
      EASEECLIENTID = var.easee_user
    }

    secret_environment_variables {
      key        = "EASEECLIENTSECRET"
      project_id = local.project
      secret     = var.easee_secret_id
      version    = "latest"
    }

    service_account_email = google_service_account.easee-controller.email
  }

  event_trigger {
    trigger_region = "europe-north1"
    event_type = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic = google_pubsub_topic.measurements_topic.id
    retry_policy = "RETRY_POLICY_DO_NOT_RETRY"
    service_account_email = google_service_account.eventarc.email
  }

}

resource "google_pubsub_topic" "measurements_topic" {
  name = "measurements"
}

# resource "google_cloud_run_service_iam_member" "member" {
#   location = google_cloudfunctions2_function.easee-control-func.location
#   service  = google_cloudfunctions2_function.easee-control-func.name
#   role     = "roles/run.invoker"
#   member   = "serviceAccount:${google_service_account.easee-controller-invoker.email}"
# }

output "function_uri" {
  value = google_cloudfunctions2_function.easee-control-func.service_config[0].uri
}