output "enabled_services" {
  description = "APIs enabled for Google Workspace MCP."
  value       = sort([for s in google_project_service.workspace_mcp : s.service])
}
