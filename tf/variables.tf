variable "easee_user" {
  type = string
}

variable "easee_secret_id" {
  type = string
  default = "EASEE_SECRET"
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