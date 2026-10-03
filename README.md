# stan-alarm

Every 10 minutes a GitHub Actions job checks apartment searches on Njuškalo, Index oglasi and
nekretnine.hr and sends a push notification via [ntfy](https://ntfy.sh) for every listing that is
genuinely new (ad ids newer than anything seen before, so "refreshed" old ads are ignored).

- Searches: `config.json`
- ntfy topic: repo secret `NTFY_TOPIC`
- State (seen ids): Actions cache, `state/state.json`

Run locally (dry-run, prints notifications instead of sending):

```
CURL_IMPERSONATE_BIN=/path/to/curl-impersonate node src/main.mjs
```

Njuškalo needs [curl-impersonate](https://github.com/lexiforest/curl-impersonate) (Chrome TLS
fingerprint) to get past its bot protection; the other two work with plain `fetch`.
