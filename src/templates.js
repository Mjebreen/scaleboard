// Example diagrams. Blocks sit in rows along the x axis and traffic flows "up" the y axis,
// so every arrow lands on a face you can see.

import { parse } from './lang.js';

function builder(name, steps) {
  const doc = { name, nodes: [], edges: [], zones: [], steps };
  let i = 0;
  return {
    doc,
    node(kind, x, y, label, extra = {}) {
      const id = 'n' + i++;
      doc.nodes.push({ id, kind, x, y, label, ...extra });
      return id;
    },
    link(from, to, extra = {}) {
      doc.edges.push({ id: 'e' + i++, from, to, ...extra });
    },
    zone(x, y, w, h, label, tone, extra = {}) {
      doc.zones.push({ id: 'z' + i++, x, y, w, h, label, tone, ...extra });
    },
  };
}

function webApp() {
  const b = builder('Load-balanced web app', [
    { title: 'One server', text: 'Everything runs on a single machine. It is simple and cheap, and it is also the only thing standing between your visitors and an outage.' },
    { title: 'Add a load balancer', text: 'Three identical servers sit behind one front door. The load balancer spreads requests across them and skips any server that stops answering.' },
    { title: 'Cache the hot reads', text: 'Most requests ask for the same few things. A cache answers those from memory, so the database only sees the misses and the writes.' },
  ]);
  const users = b.node('users', 5, 18, 'Visitors', { badge: '200k users' });
  const lb = b.node('lb', 5, 10, 'Load Balancer', { step: 2, badge: 'least connections' });
  const a = b.node('server', -1, 1, 'Server A', { meter: 52 });
  const s2 = b.node('server', 5, 1, 'Server B', { step: 2, meter: 48 });
  const s3 = b.node('server', 11, 1, 'Server C', { step: 2, meter: 50 });
  const cache = b.node('cache', 5, -8, 'Cache', { step: 3, badge: '92% hits' });
  const db = b.node('database', 5, -17, 'Database');

  b.link(users, a, { until: 1 });
  b.link(a, db, { until: 1, packet: 'data' });
  b.link(users, lb, { step: 2, flow: 'fast' });
  for (const s of [a, s2, s3]) {
    b.link(lb, s, { step: 2 });
    b.link(s, db, { step: 2, until: 2, packet: 'data' });
    b.link(s, cache, { step: 3, packet: 'data' });
  }
  b.link(cache, db, { step: 3, packet: 'data', flow: 'slow', label: 'misses only' });
  return b.doc;
}

function officeNetwork() {
  const b = builder('Small office network', [
    { title: 'The office LAN', text: 'Every desk plugs into one switch. Laptops and phones on Wi-Fi reach the same switch through the access point.' },
    { title: 'Out to the internet', text: 'The router is the only way out of the building. A firewall sits on that path and decides what is allowed through in each direction.' },
  ]);
  const wire = { arrows: 'none', packet: 'data', flow: 'slow' };
  b.zone(-5, 4, 22, 13, 'Office LAN  192.168.1.0/24', 'mint');
  const pc1 = b.node('user', -1, 13, 'PC-1');
  const pc2 = b.node('user', 6, 13, 'PC-2');
  const ph = b.node('mobile', 13, 13, 'Phone');
  const sw = b.node('switch', 6, 7, 'Switch');
  const ap = b.node('ap', 13, 7, 'Wi-Fi AP');
  const fs = b.node('server', -1, 7, 'File Server');
  const rt = b.node('router', 6, 0, 'Router', { step: 2 });
  const fw = b.node('firewall', 6, -6, 'Firewall', { step: 2 });
  const net = b.node('internet', 6, -12, 'Internet', { step: 2 });
  b.link(pc1, sw, wire);
  b.link(pc2, sw, wire);
  b.link(ph, ap, { ...wire, style: 'dashed' });
  b.link(ap, sw, wire);
  b.link(sw, fs, wire);
  b.link(sw, rt, { ...wire, step: 2 });
  b.link(rt, fw, { ...wire, step: 2 });
  b.link(fw, net, { ...wire, step: 2, label: 'WAN' });
  return b.doc;
}

function jobPipeline() {
  const b = builder('Background job pipeline', [
    { title: 'Upload and return', text: 'The API saves the upload details, drops a job on the queue and answers straight away. The person never waits for the slow part.' },
    { title: 'Workers drain the queue', text: 'Workers pull jobs at their own pace. If uploads spike, the queue grows instead of the API falling over, and you add workers to catch up.' },
  ]);
  const user = b.node('user', 4, 15, 'Uploader');
  const api = b.node('gateway', 4, 7, 'Upload API');
  const db = b.node('database', -4, 7, 'Metadata');
  const q = b.node('queue', 4, -2, 'Job Queue', { badge: '23 queued' });
  const w1 = b.node('worker', -1, -11, 'Worker A', { step: 2, meter: 71 });
  const w2 = b.node('worker', 9, -11, 'Worker B', { step: 2, meter: 64 });
  const store = b.node('storage', 4, -20, 'Video Store', { step: 2 });
  b.link(user, api);
  b.link(api, db, { packet: 'data', flow: 'slow' });
  b.link(api, q, { packet: 'event' });
  b.link(q, w1, { step: 2, packet: 'event' });
  b.link(q, w2, { step: 2, packet: 'event' });
  b.link(w1, store, { step: 2, packet: 'data', flow: 'slow' });
  b.link(w2, store, { step: 2, packet: 'data', flow: 'slow' });
  return b.doc;
}

// The examples below are written in the diagram language (see LANGUAGE.md) and laid out automatically.
function fromCode(src) {
  const r = parse(src);
  if (r.errors.length) throw new Error(`an example is broken at line ${r.errors[0].line}: ${r.errors[0].msg}`);
  return r.doc;
}

const BRANCH = `
diagram "Branch office to data centre"

step "The branch" : Desks, a printer and Wi-Fi all hang off one access switch.
desktop pc1 "PC-1"
desktop pc2 "PC-2"
printer prn "Printer"
mobile phone "Phone"
ap wifi "Wi-Fi AP"
switch access "Access switch"
pc1, pc2, prn -- access data slow
phone -- wifi data slow dashed
wifi -- access data slow
zone "Branch LAN 10.1.0.0/24" around pc1, pc2, prn, phone, wifi, access color mint

step "Out through the firewall" : One router leads out of the building. The firewall filters the traffic and the VPN carries it privately across the internet.
router edge "Edge router"
firewall fw "Firewall"
vpn tunnel "VPN"
internet net "Internet"
access -- edge -- fw -- tunnel -- net data slow

step "The data centre" : The tunnel lands in the data centre, where the racks hold the company's servers and shared files.
router core "Core router"
rack r1 "Rack A"
rack r2 "Rack B"
files nas "File share"
net -- core data slow
core -- r1, r2, nas data slow
zone "Data centre 10.9.0.0/16" around core, r1, r2, nas color lilac
`;

const SHIPPING = `
diagram "Shipping code to Kubernetes"

step "Commit" : A developer pushes a change to the repository.
person dev "Developer"
repo code "Code Repo"
dev -> code "git push"

step "Build and test" : Every commit is built and tested. Only a passing build produces an image, which goes into the registry.
ci build "CI/CD"
registry images "Registry"
code -> build "webhook" event
build -> images "push image" data

step "Deploy" : The cluster pulls the new image and replaces the old pods a few at a time, so nobody sees downtime.
k8s cluster "Kubernetes" tag "3 of 4 updated"
config flags "Config"
secrets vault "Secrets"
images -> cluster "pull" data
flags, vault -> cluster data slow

step "Watch it" : Metrics and logs flow out of the cluster. If errors climb after a release, the engineer on call is paged.
monitor metrics "Monitoring"
logs logstore "Logs"
alert pager "Alerts"
cluster -> metrics, logstore data
metrics -> pager "errors up" error
`;

const ASSISTANT = `
diagram "AI assistant with retrieval"

step "Ask a question" : The chat app sends the question through the gateway to the assistant service.
users people "Users"
webapp chat "Chat app"
gateway gw "API Gateway"
bot assistant "Assistant"
people -> chat -> gw -> assistant

step "Find the facts" : The question is turned into a vector and the closest passages are fetched from the vector database. Recent answers come straight from a cache.
vector index "Vector DB" tag "2M passages"
cache recent "Answer cache"
assistant -> index "nearest passages" data
assistant -> recent data fast

step "Write the answer" : The question and the passages go to the model, which runs on a pool of GPUs. The answer streams back to the user.
model llm "LLM"
gpu cards "GPU pool" meter 78
assistant <-> llm "prompt + passages"
llm -> cards

step "Keep it fresh" : A pipeline reads new documents, splits and embeds them, and writes them into the vector database.
files docs "Documents"
etl ingest "Ingest"
docs -> ingest -> index data slow
`;

const TELEMETRY = `
diagram "IoT telemetry pipeline"

step "Devices report in" : Sensors, meters and cameras in the field send readings over the mobile network to a device gateway.
sensor temp "Temperature"
iot meter "Smart meter"
camera cam "Camera"
tower cell "Cell tower"
gateway ingest "Device gateway"
temp, meter, cam -- cell data slow dashed
cell -> ingest data
zone "In the field" around temp, meter, cam, cell color butter

step "React in real time" : Every reading goes onto an event stream. A rules function watches it and raises an alert the moment a threshold is crossed.
stream events "Event stream"
fn rules "Rules"
alert pager "Alerts"
ingest -> events event fast
events -> rules event
rules -> pager "threshold crossed" error

step "Learn over time" : The same stream is kept in a data lake. A nightly job tidies it into the warehouse, and the dashboards read from there.
lake raw "Data lake"
etl nightly "Nightly ETL"
warehouse dw "Warehouse"
analytics bi "Dashboards"
person ops "Operator"
events -> raw data
raw -> nightly -> dw data slow
bi -> dw data
ops -> bi
`;

const SIGNUP = `
diagram "Sign-up flow"

start begin "Start"
process form "Enter email and password"
decision valid "Valid?"
process fix "Show what to fix"
process create "Create the account"
email welcome "Welcome email"
decision confirmed "Confirmed?"
process remind "Send a reminder"
end done "Account active"

begin -> form -> valid slow
valid -> create "yes" slow
valid -> fix "no" slow
fix -> form slow dashed
create -> welcome -> confirmed slow
confirmed -> done "yes" slow
confirmed -> remind "no" slow
remind -> confirmed slow dashed
`;

export const TEMPLATES = [
  { id: 'web', name: 'Load-balanced web app', hint: 'servers, cache, database', build: webApp },
  { id: 'office', name: 'Small office network', hint: 'switch, router, firewall', build: officeNetwork },
  { id: 'branch', name: 'Branch office to data centre', hint: 'desktops, VPN, racks', build: () => fromCode(BRANCH) },
  { id: 'jobs', name: 'Background job pipeline', hint: 'queue and workers', build: jobPipeline },
  { id: 'ship', name: 'Shipping code to Kubernetes', hint: 'repo, CI/CD, registry, cluster', build: () => fromCode(SHIPPING) },
  { id: 'ai', name: 'AI assistant with retrieval', hint: 'model, vector database, GPUs', build: () => fromCode(ASSISTANT) },
  { id: 'iot', name: 'IoT telemetry pipeline', hint: 'sensors, stream, data lake', build: () => fromCode(TELEMETRY) },
  { id: 'flow', name: 'Sign-up flow', hint: 'a flowchart with decisions', build: () => fromCode(SIGNUP) },
];
