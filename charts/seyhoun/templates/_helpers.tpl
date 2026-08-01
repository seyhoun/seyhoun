{{/*
Chart name, truncated to 63 chars (DNS label limit).
*/}}
{{- define "seyhoun.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Fully qualified app name.
*/}}
{{- define "seyhoun.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "seyhoun.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "seyhoun.labels" -}}
helm.sh/chart: {{ include "seyhoun.chart" . }}
{{ include "seyhoun.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "seyhoun.selectorLabels" -}}
app.kubernetes.io/name: {{ include "seyhoun.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "seyhoun.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "seyhoun.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}

{{/*
Bitnami postgresql subchart's default fullname: "<release-name>-postgresql"
(matches its common.names.fullname when postgresql.fullnameOverride is unset).
*/}}
{{- define "seyhoun.postgresqlFullname" -}}
{{- if .Values.postgresql.fullnameOverride -}}
{{- .Values.postgresql.fullnameOverride -}}
{{- else -}}
{{- printf "%s-postgresql" .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "seyhoun.databaseHost" -}}
{{- if .Values.postgresql.enabled -}}
{{- include "seyhoun.postgresqlFullname" . -}}
{{- else -}}
{{- required "database.host is required when postgresql.enabled is false" .Values.database.host -}}
{{- end -}}
{{- end -}}

{{- define "seyhoun.databasePort" -}}
{{- if .Values.postgresql.enabled -}}
5432
{{- else -}}
{{- .Values.database.port -}}
{{- end -}}
{{- end -}}

{{/*
Name of the secret holding the DB password, and the key inside it.
Falls back to the bundled postgresql subchart's secret when enabled.
*/}}
{{- define "seyhoun.databasePasswordSecretName" -}}
{{- if .Values.database.existingSecret -}}
{{- .Values.database.existingSecret -}}
{{- else if .Values.postgresql.enabled -}}
{{- if .Values.postgresql.auth.existingSecret -}}
{{- .Values.postgresql.auth.existingSecret -}}
{{- else -}}
{{- include "seyhoun.postgresqlFullname" . -}}
{{- end -}}
{{- else -}}
{{- required "database.existingSecret is required when postgresql.enabled is false" .Values.database.existingSecret -}}
{{- end -}}
{{- end -}}

{{- define "seyhoun.databasePasswordSecretKey" -}}
{{- if .Values.database.existingSecret -}}
{{- .Values.database.existingSecretPasswordKey -}}
{{- else if .Values.postgresql.enabled -}}
{{- default "password" .Values.postgresql.auth.secretKeys.userPasswordKey -}}
{{- else -}}
{{- .Values.database.existingSecretPasswordKey -}}
{{- end -}}
{{- end -}}
