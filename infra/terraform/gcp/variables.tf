variable "project_id" {
  description = "GCP project ID that owns the OAuth client used for Google Workspace MCP."
  type        = string
}

variable "manifest_path" {
  description = "Path to the MCP manifest (single source of truth for which servers are enabled)."
  type        = string
  default     = null
}

variable "extra_services" {
  description = "Additional APIs to enable beyond those derived from the manifest."
  type        = list(string)
  default     = []
}
