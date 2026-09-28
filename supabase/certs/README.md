# Supabase database CA

`prod-ca-2021.crt` is a public certificate, not a private key. The migration script uses it alongside Node's trusted roots and verifies the database hostname.

Source: https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

The URL is published in [Supabase's dashboard configuration](https://github.com/supabase/supabase/blob/master/apps/studio/hooks/custom-content/custom-content.json), under `ssl:certificate_url`.

SHA-256 certificate fingerprint: `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`.

Expires 26 April 2031. If Supabase rotates the CA, download the replacement from its Database Settings and use `SUPABASE_DB_CA_FILE` while reviewing an update to this file.
