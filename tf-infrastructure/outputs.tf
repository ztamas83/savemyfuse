output "workload_identity_provider" {
  description = "The full name of the workload identity provider"
  value       = google_iam_workload_identity_pool_provider.github_provider.name
}

output "service_account_email" {
  description = "The email of the GitHub Actions service account"
  value       = google_service_account.github_actions.email
}

output "project_number" {
  description = "The project number"
  value       = data.google_project.current.number
}

output "github_secrets_summary" {
  description = "Summary of values needed for GitHub secrets"
  value = {
    WIF_PROVIDER        = google_iam_workload_identity_pool_provider.github_provider.name
    WIF_SERVICE_ACCOUNT = google_service_account.github_actions.email
    GCP_PROJECT_ID      = var.project_id
  }
}