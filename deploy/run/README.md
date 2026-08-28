# Fluxlane RUN node Compose (tagged releases)

Same image Tag as API. Drain Streaming/SSE (start at 120s) before replacing the container. Peer RUN node stays in CLB.

Live Nginx TLS termination stays on the host; this Compose only binds `127.0.0.1:3000`.
