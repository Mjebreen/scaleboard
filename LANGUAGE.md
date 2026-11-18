# Scaleboard diagram language

A small text format for describing isometric system and network diagrams. You write blocks and
the connections between them; Scaleboard draws them, lays them out, and animates the traffic.

This file is the complete reference. It is written so that a person or an AI model can read it
once and then write correct diagrams.

**To use a diagram**, do any one of these in Scaleboard:

- Save the text as a file ending in `.sb` (or `.txt`) and choose **File → Import file**.
- Drag that file onto the board.
- Choose **File → Diagram code**, paste the text, and press **Apply to board**.

A whole AI reply works too: if the text contains a code block, only the block is read and the
sentences around it are ignored.

## If you are an AI model

When someone asks you for a diagram:

1. Answer with **one** fenced code block labelled `scaleboard`. Put explanations outside it.
2. Use only the kinds, colours, icons and keywords listed in this file. Do not invent new ones. If
   nothing fits, use `box` with a name and an `icon`, for example `box drone "Delivery drone" icon pin`.
3. **Do not write positions** (`at X,Y`) unless you are asked to. Leave them out and the layout is
   automatic.
4. Point every arrow the way a request travels: from the caller to the thing it calls.
5. Ids use letters, digits and underscores only. No spaces, no hyphens.
6. Every name, tag and label goes in `"double quotes"`.
7. Keep names short. About 14 characters fit on a block; longer names are shrunk.

## A first example

```scaleboard
diagram "Simple web app"

users visitors "Visitors"
lb front "Load Balancer"
server web1 "Web 1"
server web2 "Web 2"
database db "Database"

visitors -> front
front -> web1, web2
web1, web2 -> db data
```

That is a complete diagram: five blocks, five connections, laid out automatically.

## The rules of the format

- One statement per line. Blank lines are ignored.
- A line starting with `#` or `//` is a comment. Comments cannot follow a statement on the same line.
- Keywords and kinds are not case-sensitive. Ids are.
- **Ids** start with a letter or underscore and continue with letters, digits or underscores:
  `web1`, `order_db`. The words `diagram`, `step`, `zone` and `note` cannot be ids.
- **Text** goes in double quotes. Inside quotes, write `\"` for a quote and `\n` for a line break.
- Statements can come in any order. A connection may mention a block that is declared further down.

There are six kinds of statement:

| Statement | Starts with | Purpose |
| --- | --- | --- |
| Title | `diagram` | Names the diagram |
| Block | a kind, such as `server` | Places one component |
| Connection | an id, and contains an arrow | Joins blocks |
| Zone | `zone` | Draws a labelled area on the ground |
| Note | `note` | Adds a free-standing label |
| Step | `step` | Starts the next step of a walkthrough |

## Title

```text
diagram "Name of the diagram"
```

Optional. Without it the diagram is called "Untitled diagram".

## Blocks

```text
KIND ID "Name" [at X,Y] [color COLOUR] [icon ICON] [state STATE] [tag "text"] [meter N] [until N]
```

Only the kind, id and name are needed. Everything in square brackets is optional and can come in
any order.

```scaleboard
server api "Orders API"
server slow "Reports" state hot tag "23 queued" meter 97
database orders "Orders DB" color mint
cache sessions "Sessions" state faded
```

| Property | Meaning |
| --- | --- |
| `"Name"` | The name shown on the block. If you leave it out, the id is used. |
| `at X,Y` | A fixed position on the grid. Leave out for automatic layout. See [Layout](#layout). |
| `color C` | One of `sky`, `peach`, `butter`, `mint`, `lilac`, `rose`, `sand`, `slate`. Each kind has a sensible default. |
| `icon I` | Replaces the picture on top of the block with any icon from the [icon list](#icons), or `none` to remove it. Kinds drawn as an object (laptop, phone, wall, mast) ignore it. |
| `state S` | `ok` (default), `hot` (overloaded, shown red), `down` (grey with an "offline" tag), `faded` (dimmed). |
| `tag "text"` | A small label floating above the block, such as `"4 active"` or `"eu-west-1"`. |
| `meter N` | A load bar from 0 to 100 above the block. Green under 60, amber under 85, red above. |
| `until N` | The last step the block is shown in. See [Steps](#steps). |

### Kinds

<!-- count:start -->
There are 94 kinds of block, in 10 groups.
<!-- count:end -->

Use the word in the first column. The words in the last column are accepted too and mean the same
thing.

<!-- kinds:start -->
**People & devices**

| Kind | Draws | Default colour | Also accepted |
| --- | --- | --- | --- |
| `user` | A laptop on a desk | sand | `client`, `laptop`, `browser` |
| `desktop` | A desktop monitor and keyboard on a desk | sand | `pc`, `workstation` |
| `users` | A crowd of people | sand | `people`, `crowd`, `visitors`, `customers` |
| `person` | A single person standing | sky | `admin`, `operator`, `developer`, `actor`, `staff` |
| `mobile` | A phone | sand | `phone`, `smartphone` |
| `iot` | A small disc with a chip | mint | `device`, `embedded` |
| `sensor` | A small disc with a thermometer | butter | `probe` |
| `camera` | A flat tile with a camera | slate | `cctv`, `webcam` |
| `printer` | A flat tile with a printer | slate |  |
| `terminal` | A block with a command prompt | slate | `cli`, `console`, `shell` |

**Network**

| Kind | Draws | Default colour | Also accepted |
| --- | --- | --- | --- |
| `internet` | A floating cloud with a globe | slate | `www` |
| `cloud` | A plain floating cloud | sky | `provider`, `saas`, `aws`, `azure`, `gcp` |
| `router` | A disc with four arrows | sky |  |
| `switch` | A flat box with a row of ports | mint |  |
| `ap` | A small disc with a Wi-Fi mark | lilac | `wifi`, `access_point`, `wap` |
| `modem` | A flat tile with a modem | slate | `ont` |
| `hub` | A small disc with spokes | sand |  |
| `firewall` | A brick wall | rose |  |
| `waf` | A block with a shield and a tick | rose | `shield`, `ddos` |
| `vpn` | A block with a shield and a padlock | mint | `vpn_gateway`, `tunnel` |
| `nat` | A block with arrows passing through a box | sand | `nat_gateway` |
| `proxy` | A block with an arrow passing through a bar | slate | `reverse_proxy`, `nginx`, `sidecar`, `envoy` |
| `lb` | A block with a splitting arrow | peach | `load_balancer`, `loadbalancer`, `balancer` |
| `gateway` | A block with a gate | butter | `api`, `api_gateway` |
| `dns` | A block with a book | lilac |  |
| `dhcp` | A block with a list | butter | `ipam` |
| `cdn` | A block with a mesh | mint | `edge` |
| `tower` | A radio mast with signal waves | slate | `cell_tower`, `antenna`, `base_station` |
| `satellite` | A block with a satellite | lilac |  |

**Compute**

| Kind | Draws | Default colour | Also accepted |
| --- | --- | --- | --- |
| `server` | A block with a server rack | sky | `host` |
| `rack` | A tall cabinet of servers | slate | `cabinet`, `mainframe`, `bare_metal` |
| `vm` | A block with stacked windows | sky | `instance`, `ec2`, `virtual_machine` |
| `container` | A block with a shipping container | mint | `docker` |
| `k8s` | A block with a ship's wheel | sky | `kubernetes`, `pod`, `cluster` |
| `service` | A block with a cube | mint | `microservice` |
| `worker` | A block with a cog | slate | `job`, `consumer` |
| `fn` | A block with an ƒ (serverless function) | butter | `function`, `lambda`, `serverless` |
| `cron` | A block with a clock | butter | `scheduler`, `timer` |
| `webapp` | A block with a browser window | sky | `app`, `frontend`, `website`, `spa`, `ui` |

**Data & storage**

| Kind | Draws | Default colour | Also accepted |
| --- | --- | --- | --- |
| `database` | A tall cylinder | lilac | `db`, `sql`, `postgres`, `mysql`, `rds` |
| `warehouse` | A tall cylinder with a warehouse | butter | `data_warehouse`, `bigquery`, `snowflake`, `redshift`, `olap` |
| `lake` | A wide flat disc with waves | sky | `data_lake`, `datalake` |
| `vector` | A tall cylinder with a sparkle | mint | `vector_db`, `embeddings` |
| `graph` | A tall cylinder with linked dots | peach | `graph_db`, `neo4j` |
| `cache` | A block with a lightning bolt | rose | `redis`, `memcached`, `kv` |
| `storage` | A block with a bucket | sand | `bucket`, `s3`, `blob`, `object_storage` |
| `files` | A block with a folder | butter | `nas`, `file_share`, `fileshare`, `nfs`, `efs` |
| `disk` | A disc with a disk platter | slate | `volume`, `block_storage`, `ebs`, `ssd` |
| `search` | A block with a magnifier | butter | `index`, `elasticsearch`, `opensearch` |
| `backup` | A block with an archive box | slate | `snapshot`, `archive` |
| `etl` | A block with a funnel | peach | `pipeline`, `transform`, `dataflow`, `spark` |
| `analytics` | A block with a pie chart | lilac | `bi`, `dashboard`, `reports` |
| `ledger` | A block with chain links | butter | `blockchain` |

**Messaging**

| Kind | Draws | Default colour | Also accepted |
| --- | --- | --- | --- |
| `queue` | A block with three slots | lilac | `mq`, `sqs`, `rabbitmq`, `broker` |
| `stream` | A block with flowing arrows | lilac | `kafka`, `kinesis`, `event_stream` |
| `topic` | A block with broadcast waves | peach | `pubsub`, `sns`, `event_bus`, `eventbus` |
| `webhook` | A block with a hook | mint | `callback` |
| `email` | A block with an envelope | sky | `mail`, `smtp`, `mailserver` |
| `notify` | A block with a speech bubble | butter | `sms`, `push`, `notification`, `chat` |
| `workflow` | A block with linked steps | lilac | `orchestrator`, `saga`, `state_machine` |

**Security**

| Kind | Draws | Default colour | Also accepted |
| --- | --- | --- | --- |
| `auth` | A block with a padlock | rose | `login`, `oauth`, `sso` |
| `idp` | A block with an identity card | lilac | `identity`, `directory`, `ldap`, `active_directory`, `iam` |
| `secrets` | A block with a key | butter | `vault`, `kms`, `keys` |
| `cert` | A block with a certificate | mint | `certificate`, `tls`, `ca`, `pki` |
| `policy` | A block with a checklist | sand | `rules`, `compliance` |
| `bastion` | A block with a door | slate | `jump_host`, `jumpbox` |
| `ids` | A block with an eye | rose | `ips`, `siem`, `detection` |

**Operations**

| Kind | Draws | Default colour | Also accepted |
| --- | --- | --- | --- |
| `monitor` | A block with a chart | slate | `monitoring`, `metrics`, `prometheus`, `grafana` |
| `logs` | A block with a page of lines | sand | `logging`, `log_store` |
| `alert` | A block with a bell | rose | `alerts`, `pager`, `oncall` |
| `ci` | A block with looping arrows | mint | `cicd`, `build`, `deploy`, `jenkins` |
| `repo` | A block with a branching line | slate | `git`, `github`, `source`, `code` |
| `registry` | A block with stacked boxes | sky | `artifacts`, `images`, `packages` |
| `config` | A block with sliders | butter | `settings`, `flags`, `feature_flags` |

**AI**

| Kind | Draws | Default colour | Also accepted |
| --- | --- | --- | --- |
| `model` | A block with a sparkle | lilac | `llm`, `ai`, `ml`, `inference` |
| `bot` | A block with a robot face | peach | `robot`, `chatbot`, `agent`, `assistant` |
| `gpu` | A block with a chip | mint | `accelerator`, `training` |

**Business**

| Kind | Draws | Default colour | Also accepted |
| --- | --- | --- | --- |
| `external` | A block with a plug (someone else's system) | sand | `external_api`, `third_party`, `partner`, `vendor` |
| `payment` | A block with a payment card | mint | `payments`, `billing`, `checkout`, `stripe` |
| `bank` | A block with a bank building | sand |  |
| `shop` | A block with a shop front | peach | `storefront`, `ecommerce`, `merchant` |
| `building` | A block with an office building | slate | `office`, `hq`, `site` |
| `factory` | A block with a factory | sand | `plant` |
| `geo` | A block with a map pin | mint | `maps`, `location`, `gps` |
| `media` | A block with a picture | rose | `video`, `transcoder` |

**Flowchart & generic**

| Kind | Draws | Default colour | Also accepted |
| --- | --- | --- | --- |
| `start` | A flat disc with a play mark | mint | `begin` |
| `end` | A flat disc with a stop mark | rose | `finish`, `done` |
| `process` | A flat card that carries its name | sky | `task`, `action`, `activity` |
| `decision` | A flat diamond with a question mark | butter | `condition`, `choice` |
| `document` | A flat tile with a page | sand | `file`, `report`, `form` |
| `box` | A plain block, for anything not listed | sand | `block`, `generic`, `component` |
| `cylinder` | A plain tall cylinder | sand |  |
| `plate` | A plain flat disc | sand |  |
| `tile` | A plain flat tile | sand |  |
<!-- kinds:end -->

When nothing in the tables fits, use one of the plain shapes at the end (`box`, `cylinder`, `plate`,
`tile`), give it a name, and pick an icon.

### Icons

Every block that shows an icon can show any of these instead:

<!-- icons:start -->
`server`, `split`, `globe`, `gate`, `book`, `cross`, `swap`, `wifi`, `mesh`, `modem`, `hub`, `shield`, `vpn`, `nat`, `proxy`, `list`, `satellite`, `vm`, `container`, `helm`, `cube`, `cog`, `fn`, `clock`, `window`, `chip`, `terminal`, `rows`, `bolt`, `queue`, `bucket`, `search`, `warehouse`, `waves`, `sparkle`, `graph`, `folder`, `disk`, `archive`, `funnel`, `pie`, `chain`, `stream`, `broadcast`, `hook`, `mail`, `chat`, `flow`, `lock`, `idcard`, `key`, `cert`, `checklist`, `door`, `eye`, `chart`, `doc`, `bell`, `loop`, `branch`, `boxes`, `sliders`, `robot`, `person`, `camera`, `printer`, `thermo`, `plug`, `card`, `bank`, `shop`, `cart`, `building`, `factory`, `pin`, `image`, `play`, `stop`, `question`, `check`, `cross_mark`, `warning`, `star`, `heart`, `flag`, `code`, `braces`, `download`, `upload`, `power`, `dollar`
<!-- icons:end -->

```scaleboard
box drone "Delivery drone" icon pin color mint
box ledger_api "Billing API" icon dollar
server quiet "No picture" icon none
cylinder tank "Fuel tank" icon warning color rose
```

### Flowcharts

The last group of kinds makes flowcharts: `start` and `end` are round, `process` is a card with its
name written on it, and `decision` is a diamond. Label the branches on the connections.

```scaleboard
start begin "Start"
process form "Fill in the form"
decision ok "Valid?"
process fix "Show what to fix"
end done "Saved"

begin -> form -> ok
ok -> done "yes"
ok -> fix "no"
fix -> form dashed
```

## Connections

```text
FROM ARROW TO ["label"] [PACKET] [SPEED] [dashed] [route N] [until N]
```

```scaleboard
server a "A"
server b "B"
server c "C"
database d "D"

a -> b
b <-> c "sync" data
c -- d
a -> d "nightly export" data slow dashed
```

| Arrow | Meaning |
| --- | --- |
| `a -> b` | One way, from `a` to `b`. Packets travel from `a` to `b`. |
| `a <- b` | The same as `b -> a`. |
| `a <-> b` | Arrowheads at both ends. Packets travel both ways. |
| `a -- b` | A plain line with no arrowheads, for cables and peer links. Packets travel both ways. |

**Several at once.** List ids with commas on either side, or chain arrows. The properties at the
end apply to every connection the line creates.

```scaleboard
lb front "LB"
server s1 "S1"
server s2 "S2"
server s3 "S3"
cache c "Cache"
database d "DB"

front -> s1, s2, s3
s1, s2, s3 -> c data
c -> d -> s1 "replication" event slow
```

| Property | Meaning |
| --- | --- |
| `"label"` | A label on the middle of the line. It must be in quotes. |
| Packet type | `request` (default, orange), `response` (green), `data` (blue), `event` (purple), `error` (red). |
| Speed | `slow`, `normal` (default), `fast`, or `still` for a line with no moving packets. |
| `dashed` | Draws a dashed line. |
| `route N` | Forces one of the possible paths, 1 to 4. Leave out to let Scaleboard choose. |
| `until N` | The last step the connection is shown in. |

On a two-way connection (`<->` or `--`) whose packet type is `request`, the packets coming back
are drawn as `response`.

## Zones

A zone is a tinted area on the ground with a dashed border, for a subnet, a region, a data centre
or a team's part of the system.

```text
zone [ID] "Label" around ID, ID, ... [pad N] [color COLOUR] [until N]
zone [ID] "Label" at X,Y size WxH [color COLOUR] [until N]
```

`around` is the easy form: the zone is the smallest rectangle that fits the listed blocks. `pad` is
the margin in grid squares (default 1). The id is optional. Because it is a rectangle, a block you
did not list can still fall inside it if the layout puts that block between the ones you did.

```scaleboard
server web "Web"
server api "API"
database db "DB"
web -> api -> db data

zone "Public subnet" around web color sky
zone "Private subnet" around api, db color mint
```

## Notes

A note is a label that stands on its own.

```text
note [ID] "Text" near ID
note [ID] "Text" at X,Y
```

```scaleboard
database db "Orders DB"
note "Read replicas come later" near db
```

## Steps

Steps turn a diagram into a walkthrough: each step has a title, a few sentences of explanation,
and its own set of visible blocks.

```text
step "Title" : One or two sentences about what this step shows.
```

- **Everything written after a `step` line first appears in that step**, and stays for the rest.
- Anything written before the first `step` line appears in step 1.
- `until N` on a block, connection, zone or note makes step N the last one it is shown in.
- A connection is only drawn while both of its blocks are shown.
- To replace a connection, give the old one `until` and write the new one under the later step.
- A diagram with no `step` lines has a single step.

```scaleboard
diagram "Growing a web app"

step "One server" : Everything runs on one machine. If it fails, the site is down.
users visitors "Visitors"
server a "Server A"
database db "Database"
visitors -> a until 1
a -> db data

step "Add a load balancer" : Three identical servers share the traffic.
lb front "Load Balancer"
server b "Server B"
server c "Server C"
visitors -> front fast
front -> a, b, c
b, c -> db data

step "Add a cache" : Most reads are answered from memory, so the database only sees the misses.
cache hot "Cache" tag "92% hits"
a, b, c -> hot data
hot -> db "misses only" data slow
```

In that example `visitors -> a until 1` is the direct connection that the load balancer replaces
from step 2 onwards.

The text after the colon runs to the end of the line. To include a line break, put the text in
quotes and write `\n`.

## Layout

### Automatic (recommended)

Leave out `at` and Scaleboard places everything:

- Blocks that nothing points to form the first row.
- Each connection puts its target at least one row after its source.
- Within a row, blocks keep the order they were written in, adjusted to keep lines from crossing.

So the only thing that matters is the direction of your arrows. Write them the way traffic flows
(`visitors -> front -> web -> db`) and the diagram reads from the front of the board to the back.

Either place every block yourself or none of them. If only some blocks have `at`, the others are
still placed as if nothing had been fixed, and they may overlap.

### By hand

The board is a grid seen from the front right.

- `x` increases towards the bottom right of the screen. `y` increases towards the bottom left.
- A block covers about 3 by 3 squares, centred on its position.
- Blocks with the **same `y`** form a row. Put neighbours **6 apart** in `x`.
- Put each tier **8 lower in `y`** than the one that feeds it, so traffic flows towards the top
  right of the screen. Arrows that run this way land on a face you can see.
- Positions are whole numbers and may be negative.

```scaleboard
diagram "Hand-placed"

users visitors "Visitors" at 0,16
lb front "Load Balancer" at 0,8
server a "Server A" at -6,0
server b "Server B" at 0,0
server c "Server C" at 6,0
database db "Database" at 0,-8

visitors -> front
front -> a, b, c
a, b, c -> db data
```

## Complete examples

### An office network

```scaleboard
diagram "Small office network"

user pc1 "PC-1"
user pc2 "PC-2"
mobile phone "Phone"
ap wifi "Wi-Fi AP"
switch sw "Switch"
server files "File Server"
router rt "Router"
firewall fw "Firewall"
internet net "Internet"

pc1, pc2 -- sw data slow
phone -- wifi data slow dashed
wifi -- sw data slow
sw -- files data slow
sw -- rt -- fw data slow
fw -- net "WAN" data slow

zone "Office LAN 192.168.1.0/24" around pc1, pc2, phone, wifi, sw, files color mint
```

### A background job pipeline with a failure

```scaleboard
diagram "Video uploads"

step "Upload and return" : The API stores the details, queues a job and answers at once.
user uploader "Uploader"
gateway api "Upload API"
database meta "Metadata"
queue jobs "Job Queue" tag "23 queued"
uploader -> api
api -> meta data slow
api -> jobs event

step "Workers drain the queue" : Workers pull jobs at their own pace and write the results to storage.
worker w1 "Worker A" meter 71
worker w2 "Worker B" meter 64
storage videos "Video Store"
jobs -> w1, w2 event
w1, w2 -> videos data slow

step "A worker fails" : Worker B stops. Its jobs stay in the queue and Worker A picks them up, more slowly.
worker w3 "Worker C" state down
jobs -> w3 "no consumer" error still dashed
note "Queue grows until C is replaced" near jobs
```

### A microservice request path

```scaleboard
diagram "Checkout request"

mobile app "Shopper"
cdn edge "CDN"
gateway gw "API Gateway"
auth login "Auth"
service cart "Cart"
service pay "Payments"
external bank "Card network"
database orders "Orders DB"
queue events "Order events"
fn mail "Send receipt"

app -> edge -> gw
gw -> login "check token"
gw -> cart -> pay
pay <-> bank "authorise"
pay -> orders data
pay -> events event
events -> mail event slow

zone "Our platform" around gw, login, cart, pay, orders, events, mail color sky
```

## Common mistakes

| Wrong | Right | Why |
| --- | --- | --- |
| `a -> b : HTTPS` | `a -> b "HTTPS"` | Labels must be in quotes. An unquoted word is ignored. |
| `server web-1 "Web"` | `server web_1 "Web"` | Ids cannot contain hyphens. |
| `server "Web"` | `server web "Web"` | A block needs an id so connections can refer to it. |
| `web -> Database` | `web -> db` | Connections use ids, not names. |
| `loadbalancer -> web` with no block called `loadbalancer` | `lb front "LB"` then `front -> web` | Every id in a connection must be declared as a block. |
| `server web "Web" # main` | Put the comment on its own line | Comments cannot follow a statement. |
| `db -> api` for "the API reads the database" | `api -> db` | Arrows point from the caller to the thing called. |

## Messages

When the text cannot be read, Scaleboard reports the line number and what to change, for example
`Line 12: there is no block called "cach". Did you mean "cache"?`. Nothing is applied until every
error is fixed.

Things it does not understand but can safely skip, such as an unknown word after a connection, are
reported as warnings and the diagram is still drawn.

## Going the other way

**File → Diagram code** always shows the current board written in this language, with every
position included, so any diagram drawn by hand can be copied out, edited as text, or given to an
AI model to change.
