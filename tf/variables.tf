variable "easee_user" {
  type = string
}

variable "easee_secret_id" {
  type = string
  default = "EASEE_SECRET"
  sensitive = true
}

