variable region {
  type = string
  default =  "europe-north1"
}

variable project_id {
  type = string
}
variable "easee_user" {
  type = string
}

variable "easee_secret_id" {
  type = string
  default = "EASEE_SECRET"
  sensitive = true
}

variable "easee_site_secret_id" {
  type = string
  default = "EASEE_SITE"
  sensitive = true
}

variable "LOG_LEVEL" {
  type = string
  default = "INFO" 
}

variable "EASEE_PHASES" {
  type = list(string)
  default = ["L1"]
}

variable admin_email {
  type = string
}

variable chat_notification_channel {
  type = string
  nullable = true
}