variable "project_id" {
  description = "The Google Cloud project ID"
  type        = string
}

variable "github_repository" {
  description = "The GitHub repository in the format 'owner/repo'"
  type        = string
}

variable "region" {
  description = "The Google Cloud region"
  type        = string
  default     = "europe-north1"
}

variable "github_actions_roles" {
  description = "List of IAM roles to grant to the GitHub Actions service account"
  type        = list(string)
  default = [
    "roles/datastore.owner",
    "roles/cloudfunctions.admin",
    "roles/resourcemanager.projectIamAdmin",
    "roles/pubsub.admin",
    "roles/iam.serviceAccountAdmin",
    "roles/storage.admin",
    "roles/monitoring.admin",
    "roles/iam.serviceAccountUser"
  ]
}