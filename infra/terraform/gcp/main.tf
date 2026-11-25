# Enables the standard Workspace APIs and the *mcp.googleapis.com services for every
# server that is `enabled: true` in infra/mcp/servers.yaml.
#
# NOT managed here (manual, see infra/README.md):
#   - OAuth consent screen and the OAuth client ("Use this client for an AI-powered agent").
#   - Google Workspace Developer Preview Program enrolment.

locals {
  manifest = yamldecode(file(coalesce(var.manifest_path, "${path.module}/../../mcp/servers.yaml")))

  services = toset(concat(
    flatten([
      for name, s in local.manifest.servers : try(s.gcp_services, [])
      if try(s.enabled, true)
    ]),
    var.extra_services,
  ))
}

resource "google_project_service" "workspace_mcp" {
  for_each = local.services

  project = var.project_id
  service = each.value

  # Never disable APIs on destroy: other workloads in the project may depend on them.
  disable_on_destroy         = false
  disable_dependent_services = false
}
