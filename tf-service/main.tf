terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 7.5.0"
    }
  }

  backend "gcs" {
    
  }
}

provider "google" {
  region      = var.region
  project   = var.project_id
}
data "google_project" "project" { }
resource "random_id" "default" {
  byte_length = 8
}


# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "firestore.googleapis.com",
    "pubsub.googleapis.com",
    "run.googleapis.com",
    "iam.googleapis.com",
    "storage.googleapis.com",
    "cloudfunctions.googleapis.com",
    "cloudbuild.googleapis.com",
    "eventarc.googleapis.com",
    "secretmanager.googleapis.com",
    "monitoring.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "artifactregistry.googleapis.com"
  ])
  
  project = var.project_id
  service = each.value
  
  disable_on_destroy = false
}

# Create a dedicated service account
resource "google_service_account" "eventarc" {
  account_id   = "${local.service_name}-eventarc-sa"
  display_name = "Eventarc Trigger Service Account"
}

# Grant permission to receive Eventarc events
resource "google_project_iam_member" "eventreceiver" {
  project = data.google_project.project.name
  role    = "roles/eventarc.eventReceiver"
  member  = "serviceAccount:${google_service_account.eventarc.email}"
}

# Grant permission to invoke Cloud Run services
resource "google_project_iam_member" "runinvoker" {
  project = data.google_project.project.name
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.eventarc.email}"
}

resource "google_service_account" "easee-controller" {
  account_id   = "${local.service_name}-easee-ctrl-sa"
  display_name = "Easee Controller Function acc"
}


resource "google_service_account" "measurement-processor" {
  account_id   = "${local.service_name}-processor-sa"
  display_name = "Measurement Processor Function acc"
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
  project = data.google_project.project.name
  role    = each.value
  member  = "serviceAccount:${google_service_account.easee-controller.email}"
}

resource "google_storage_bucket" "gcf-source" {
  name                        = "${var.project_id}-${local.service_name}-gcf-source" # Every bucket name must be globally unique
  location                    = "europe-north2"
  uniform_bucket_level_access = true
}

data "archive_file" "easee-source-archive" {
  type        = "zip"
  output_path = "/tmp/function-source.zip"
  source_dir  = "../src/easee-control/"
  excludes = [ ".venv", ".env", ".vscode", "test.json", "__pycache__" ]
}
resource "google_storage_bucket_object" "object" {
  name   = "${local.service_name}-easee-control-${data.archive_file.easee-source-archive.output_sha256}.zip"
  bucket = google_storage_bucket.gcf-source.name
  source = data.archive_file.easee-source-archive.output_path # Add path to the zipped function source code
}

variable "processor_roles" {
  type = list(string)
  default = [
    "roles/artifactregistry.createOnPushWriter",
    "roles/eventarc.eventReceiver",
    "roles/logging.logWriter",
    "roles/pubsub.subscriber",
    # "roles/secretmanager.secretAccessor",
    # "roles/storage.objectAdmin",
    # "roles/datastore.user"
  ]
}



resource "google_project_iam_member" "processor-role" {
  for_each = toset(var.processor_roles)
  project = data.google_project.project.name
  role    = each.value
  member  = "serviceAccount:${google_service_account.measurement-processor.email}"
}

data "archive_file" "measurement-processor-zip" {
  type        = "zip"
  output_path = "/tmp/measurement-processor-function-source.zip"
  source_dir  = "../src/measurement-processor/"
  excludes = [ ".env", ".vscode", "cmd/**"]
}

resource "google_storage_bucket_object" "measurement-processor-src-object" {
  name   = "${local.service_name}-measurement-processor-${data.archive_file.measurement-processor-zip.output_sha256}.zip"
  bucket = google_storage_bucket.gcf-source.name
  source = data.archive_file.measurement-processor-zip.output_path # Add path to the zipped function source code
}

resource "google_firestore_database" "database" {
  depends_on = [ google_project_service.required_apis ]
  project     = data.google_project.project.name
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
}

resource "google_pubsub_topic" "measurements_topic" {
  name = "measurements"
}

resource "google_cloudfunctions2_function" "easee-control-func" {
  depends_on = [ google_project_service.required_apis ]
  name        = "${local.service_name}-function-easee-control"
  location    = "europe-north1"
  description = "Easee control function"

  build_config {
    runtime     = "python312"
    entry_point = "main" # Set the entry point
    source {
      storage_source {
        bucket = google_storage_bucket.gcf-source.name
        object = google_storage_bucket_object.object.name
      }
    }
  }

  service_config {
    max_instance_count = 1
    min_instance_count = 0
    available_memory   = "256Mi"
    timeout_seconds    = 30

    ingress_settings = "ALLOW_INTERNAL_ONLY"
    

    environment_variables = {
      EASEECLIENTID = var.easee_user
      LOG_LEVEL = var.LOG_LEVEL
      CONF_PHASES = join(",", var.EASEE_PHASES)
    }

    secret_environment_variables {
      key        = "EASEECLIENTSECRET"
      project_id = data.google_project.project.name
      secret     = var.easee_secret_id
      version    = "latest"
    }

    secret_environment_variables {
      key        = "EASEE_SITE"
      project_id = data.google_project.project.name
      secret     = var.easee_site_secret_id
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

  labels = {
    service = local.service_name
  }

}

resource "google_cloudfunctions2_function" "measurement-processor-func" {
  depends_on = [ google_project_service.required_apis ]
  name        = "${local.service_name}-measurement-processor"
  location    = "europe-north1"
  description = "${local.service_name} Measurement Processor function"
  build_config {
    runtime     = "go125"
    entry_point = "PubSubProcessor" # Set the entry point
    source {
      storage_source {
        bucket = google_storage_bucket.gcf-source.name
        object = google_storage_bucket_object.measurement-processor-src-object.name
      }
    }
  }
  labels = {
    service = local.service_name
  }

  service_config {
    max_instance_count = 1
    min_instance_count = 0
    available_memory   = "256Mi"
    timeout_seconds    = 30

    ingress_settings = "ALLOW_INTERNAL_ONLY"
    

    # environment_variables = {
    #   EASEECLIENTID = var.easee_user
    #   LOG_LEVEL = var.LOG_LEVEL
    #   CONF_PHASES = join(",", var.EASEE_PHASES)
    # }

    # secret_environment_variables {
    #   key        = "EASEECLIENTSECRET"
    #   project_id = data.google_project.project.name
    #   secret     = var.easee_secret_id
    #   version    = "latest"
    # }

    # secret_environment_variables {
    #   key        = "EASEE_SITE"
    #   project_id = data.google_project.project.name
    #   secret     = var.easee_site_secret_id
    #   version    = "latest"
    # # }

    service_account_email = google_service_account.measurement-processor.email
  }


  event_trigger {
    trigger_region = "europe-north1"
    event_type = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic = google_pubsub_topic.measurements_topic.id
    retry_policy = "RETRY_POLICY_DO_NOT_RETRY"
    service_account_email = google_service_account.eventarc.email
  }
}

resource "google_monitoring_notification_channel" "email" {
 
 display_name = "Owner e-mail"
   type = "email"
   labels = {
     email_address = var.admin_email
  }
}


resource "google_monitoring_notification_channel" "chat" {
   count = var.chat_notification_channel != null ? 1 : 0
   display_name = "Google Chat notifications"
   type = "google_chat"
   labels = {
     space = var.chat_notification_channel
   }
}

# resource "google_monitoring_alert_policy" "alert_policy" {
#   display_name = "Memory Utilization > 90%"
#   documentation {
#     content = "The $${metric.display_name} of the $${resource.type} $${resource.label.instance_id} in $${resource.project} has exceeded 90% for over 5 minutes."
#   }
#   combiner     = "OR"
#   conditions {
#     display_name = "Memory Utilization condition"
#     condition_threshold {
#         comparison = "COMPARISON_GT"
#         duration = "180s"
#         filter = "resource.type = \"cloud_run_revision\" AND metric.type = \"run.googleapis.com/container/memory/utilizations\""
#         threshold_value = "0.8"
#         trigger {
#           percent = 50
#         }
#     }
#   }

#   conditions {
#     display_name = "Error Count condition"
#     condition_threshold {
#       comparison = "COMPARISON_GT"
#       duration = "180s"
#       filter = "severity=ERROR AND resource.labels.service_name=\"${google_cloudfunctions2_function.easee-control-func.name}\""
#     }
#   }


#   alert_strategy {
#     notification_channel_strategy {
#         renotify_interval = "21600s"
#         notification_channel_names = [
#           google_monitoring_notification_channel.email.name,
#           google_monitoring_notification_channel.chat[0].name]
#     }
#   }

#   notification_channels = [google_monitoring_notification_channel.email.name, google_monitoring_notification_channel.chat[0].name]

#   user_labels = {
#     severity = "warning"
#   }
# }

output "function_uri" {
  value = google_cloudfunctions2_function.easee-control-func.service_config[0].uri
}