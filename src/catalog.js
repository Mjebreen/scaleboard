// Everything you can place on the board, plus the colour and motion tables.
// This is the single source of truth: the library panel, the diagram language and the
// tables in LANGUAGE.md (npm run docs) are all generated from it.

/** Block colours as [top face, left face, right face]. */
export const TONES = {
  sky: ['#d6e6f8', '#b9d3f1', '#a2c2e8'],
  peach: ['#fcd9b8', '#f7bf93', '#efa672'],
  butter: ['#fcebb3', '#f6d98a', '#edc766'],
  mint: ['#d3eecf', '#b5deb1', '#9bcf98'],
  lilac: ['#e2d7f6', '#cdbcee', '#b9a5e3'],
  rose: ['#fad5d8', '#f3b9bf', '#ea9fa7'],
  sand: ['#f3ebdd', '#e6dbc8', '#d8cab3'],
  slate: ['#dbe1e8', '#c3ccd7', '#adb8c6'],
};
export const HOT = ['#fbcfcd', '#f2aaa8', '#e88d8b'];
export const DOWN = ['#e6e3de', '#d4d0ca', '#c4bfb8'];

export const STATUSES = [
  ['ok', 'Normal'],
  ['hot', 'Overloaded'],
  ['down', 'Down'],
  ['faded', 'Faded'],
];

export const PACKETS = {
  request: '#f2924d',
  response: '#7cc47f',
  data: '#6ea8ee',
  event: '#b08ae6',
  error: '#e5645f',
};

/** Packet speed in px/s and the gap between packets in px. */
export const FLOW = {
  slow: { speed: 45, gap: 150 },
  normal: { speed: 85, gap: 105 },
  fast: { speed: 150, gap: 70 },
};

export const GROUPS = [
  'People & devices',
  'Network',
  'Compute',
  'Data & storage',
  'Messaging',
  'Security',
  'Operations',
  'AI',
  'Business',
  'Flowchart & generic',
  'Annotate',
];

// [kind, name, shape, colour, icon, description, other accepted names, extra]
// Descriptions start with "A" or "An": they fill the "Draws" column of the language guide.
const table = {
  'People & devices': [
    ['user', 'User', 'laptop', 'sand', null, 'A laptop on a desk', 'client laptop browser'],
    ['desktop', 'Desktop PC', 'desktop', 'sand', null, 'A desktop monitor and keyboard on a desk', 'pc workstation'],
    ['users', 'Users', 'crowd', 'sand', null, 'A crowd of people', 'people crowd visitors customers'],
    ['person', 'Person', 'person', 'sky', null, 'A single person standing', 'admin operator developer actor staff'],
    ['mobile', 'Phone', 'phone', 'sand', null, 'A phone', 'phone smartphone'],
    ['iot', 'IoT Device', 'disc', 'mint', 'chip', 'A small disc with a chip', 'device embedded', { R: 1.15, h: 0.6 }],
    ['sensor', 'Sensor', 'disc', 'butter', 'thermo', 'A small disc with a thermometer', 'probe', { R: 1.05, h: 0.5 }],
    ['camera', 'Camera', 'tile', 'slate', 'camera', 'A flat tile with a camera', 'cctv webcam'],
    ['printer', 'Printer', 'tile', 'slate', 'printer', 'A flat tile with a printer', ''],
    ['terminal', 'Terminal', 'block', 'slate', 'terminal', 'A block with a command prompt', 'cli console shell'],
  ],
  Network: [
    ['internet', 'Internet', 'cloud', 'slate', 'globe', 'A floating cloud with a globe', 'www'],
    ['cloud', 'Cloud', 'cloud', 'sky', null, 'A plain floating cloud', 'provider saas aws azure gcp'],
    ['router', 'Router', 'disc', 'sky', 'cross', 'A disc with four arrows', '', { R: 1.5, h: 0.95 }],
    ['switch', 'Switch', 'switch', 'mint', 'swap', 'A flat box with a row of ports', ''],
    ['ap', 'Access Point', 'disc', 'lilac', 'wifi', 'A small disc with a Wi-Fi mark', 'wifi access_point wap', { R: 1.15, h: 0.55 }],
    ['modem', 'Modem', 'tile', 'slate', 'modem', 'A flat tile with a modem', 'ont'],
    ['hub', 'Hub', 'disc', 'sand', 'hub', 'A small disc with spokes', '', { R: 1.2, h: 0.6 }],
    ['firewall', 'Firewall', 'wall', 'rose', null, 'A brick wall', ''],
    ['waf', 'WAF', 'block', 'rose', 'shield', 'A block with a shield and a tick', 'shield ddos'],
    ['vpn', 'VPN', 'block', 'mint', 'vpn', 'A block with a shield and a padlock', 'vpn_gateway tunnel'],
    ['nat', 'NAT Gateway', 'block', 'sand', 'nat', 'A block with arrows passing through a box', 'nat_gateway'],
    ['proxy', 'Proxy', 'block', 'slate', 'proxy', 'A block with an arrow passing through a bar', 'reverse_proxy nginx sidecar envoy'],
    ['lb', 'Load Balancer', 'block', 'peach', 'split', 'A block with a splitting arrow', 'load_balancer loadbalancer balancer'],
    ['gateway', 'API Gateway', 'block', 'butter', 'gate', 'A block with a gate', 'api api_gateway'],
    ['dns', 'DNS', 'block', 'lilac', 'book', 'A block with a book', ''],
    ['dhcp', 'DHCP', 'block', 'butter', 'list', 'A block with a list', 'ipam'],
    ['cdn', 'CDN', 'block', 'mint', 'mesh', 'A block with a mesh', 'edge'],
    ['tower', 'Cell Tower', 'tower', 'slate', null, 'A radio mast with signal waves', 'cell_tower antenna base_station'],
    ['satellite', 'Satellite', 'block', 'lilac', 'satellite', 'A block with a satellite', ''],
  ],
  Compute: [
    ['server', 'Server', 'block', 'sky', 'server', 'A block with a server rack', 'host'],
    ['rack', 'Server Rack', 'rack', 'slate', null, 'A tall cabinet of servers', 'cabinet mainframe bare_metal'],
    ['vm', 'Virtual Machine', 'block', 'sky', 'vm', 'A block with stacked windows', 'instance ec2 virtual_machine'],
    ['container', 'Container', 'block', 'mint', 'container', 'A block with a shipping container', 'docker'],
    ['k8s', 'Kubernetes', 'block', 'sky', 'helm', "A block with a ship's wheel", 'kubernetes pod cluster'],
    ['service', 'Service', 'block', 'mint', 'cube', 'A block with a cube', 'microservice'],
    ['worker', 'Worker', 'block', 'slate', 'cog', 'A block with a cog', 'job consumer'],
    ['fn', 'Function', 'block', 'butter', 'fn', 'A block with an ƒ (serverless function)', 'function lambda serverless'],
    ['cron', 'Scheduler', 'block', 'butter', 'clock', 'A block with a clock', 'scheduler timer'],
    ['webapp', 'Web App', 'block', 'sky', 'window', 'A block with a browser window', 'app frontend website spa ui'],
  ],
  'Data & storage': [
    ['database', 'Database', 'drum', 'lilac', 'rows', 'A tall cylinder', 'db sql postgres mysql rds'],
    ['warehouse', 'Data Warehouse', 'drum', 'butter', 'warehouse', 'A tall cylinder with a warehouse', 'data_warehouse bigquery snowflake redshift olap'],
    ['lake', 'Data Lake', 'disc', 'sky', 'waves', 'A wide flat disc with waves', 'data_lake datalake', { R: 1.8, h: 0.6 }],
    ['vector', 'Vector DB', 'drum', 'mint', 'sparkle', 'A tall cylinder with a sparkle', 'vector_db embeddings'],
    ['graph', 'Graph DB', 'drum', 'peach', 'graph', 'A tall cylinder with linked dots', 'graph_db neo4j'],
    ['cache', 'Cache', 'block', 'rose', 'bolt', 'A block with a lightning bolt', 'redis memcached kv'],
    ['storage', 'Object Storage', 'block', 'sand', 'bucket', 'A block with a bucket', 'bucket s3 blob object_storage'],
    ['files', 'File Share', 'block', 'butter', 'folder', 'A block with a folder', 'nas file_share fileshare nfs efs'],
    ['disk', 'Disk', 'disc', 'slate', 'disk', 'A disc with a disk platter', 'volume block_storage ebs ssd', { R: 1.3, h: 0.8 }],
    ['search', 'Search Index', 'block', 'butter', 'search', 'A block with a magnifier', 'index elasticsearch opensearch'],
    ['backup', 'Backup', 'block', 'slate', 'archive', 'A block with an archive box', 'snapshot archive'],
    ['etl', 'ETL', 'block', 'peach', 'funnel', 'A block with a funnel', 'pipeline transform dataflow spark'],
    ['analytics', 'Analytics', 'block', 'lilac', 'pie', 'A block with a pie chart', 'bi dashboard reports'],
    ['ledger', 'Ledger', 'block', 'butter', 'chain', 'A block with chain links', 'blockchain'],
  ],
  Messaging: [
    ['queue', 'Queue', 'block', 'lilac', 'queue', 'A block with three slots', 'mq sqs rabbitmq broker'],
    ['stream', 'Event Stream', 'block', 'lilac', 'stream', 'A block with flowing arrows', 'kafka kinesis event_stream'],
    ['topic', 'Pub/Sub Topic', 'block', 'peach', 'broadcast', 'A block with broadcast waves', 'pubsub sns event_bus eventbus'],
    ['webhook', 'Webhook', 'block', 'mint', 'hook', 'A block with a hook', 'callback'],
    ['email', 'Email', 'block', 'sky', 'mail', 'A block with an envelope', 'mail smtp mailserver'],
    ['notify', 'Notification', 'block', 'butter', 'chat', 'A block with a speech bubble', 'sms push notification chat'],
    ['workflow', 'Workflow', 'block', 'lilac', 'flow', 'A block with linked steps', 'orchestrator saga state_machine'],
  ],
  Security: [
    ['auth', 'Auth', 'block', 'rose', 'lock', 'A block with a padlock', 'login oauth sso'],
    ['idp', 'Identity Provider', 'block', 'lilac', 'idcard', 'A block with an identity card', 'identity directory ldap active_directory iam'],
    ['secrets', 'Secrets', 'block', 'butter', 'key', 'A block with a key', 'vault kms keys'],
    ['cert', 'Certificate', 'block', 'mint', 'cert', 'A block with a certificate', 'certificate tls ca pki'],
    ['policy', 'Policy', 'block', 'sand', 'checklist', 'A block with a checklist', 'rules compliance'],
    ['bastion', 'Bastion', 'block', 'slate', 'door', 'A block with a door', 'jump_host jumpbox'],
    ['ids', 'Intrusion Detection', 'block', 'rose', 'eye', 'A block with an eye', 'ips siem detection'],
  ],
  Operations: [
    ['monitor', 'Monitoring', 'block', 'slate', 'chart', 'A block with a chart', 'monitoring metrics prometheus grafana'],
    ['logs', 'Logs', 'block', 'sand', 'doc', 'A block with a page of lines', 'logging log_store'],
    ['alert', 'Alerts', 'block', 'rose', 'bell', 'A block with a bell', 'alerts pager oncall'],
    ['ci', 'CI/CD', 'block', 'mint', 'loop', 'A block with looping arrows', 'cicd build deploy jenkins'],
    ['repo', 'Code Repo', 'block', 'slate', 'branch', 'A block with a branching line', 'git github source code'],
    ['registry', 'Registry', 'block', 'sky', 'boxes', 'A block with stacked boxes', 'artifacts images packages'],
    ['config', 'Config', 'block', 'butter', 'sliders', 'A block with sliders', 'settings flags feature_flags'],
  ],
  AI: [
    ['model', 'AI Model', 'block', 'lilac', 'sparkle', 'A block with a sparkle', 'llm ai ml inference'],
    ['bot', 'Bot', 'block', 'peach', 'robot', 'A block with a robot face', 'robot chatbot agent assistant'],
    ['gpu', 'GPU', 'block', 'mint', 'chip', 'A block with a chip', 'accelerator training'],
  ],
  Business: [
    ['external', 'External API', 'block', 'sand', 'plug', "A block with a plug (someone else's system)", 'external_api third_party partner vendor'],
    ['payment', 'Payments', 'block', 'mint', 'card', 'A block with a payment card', 'payments billing checkout stripe'],
    ['bank', 'Bank', 'block', 'sand', 'bank', 'A block with a bank building', ''],
    ['shop', 'Shop', 'block', 'peach', 'shop', 'A block with a shop front', 'storefront ecommerce merchant'],
    ['building', 'Office', 'block', 'slate', 'building', 'A block with an office building', 'office hq site'],
    ['factory', 'Factory', 'block', 'sand', 'factory', 'A block with a factory', 'plant'],
    ['geo', 'Maps', 'block', 'mint', 'pin', 'A block with a map pin', 'maps location gps'],
    ['media', 'Media', 'block', 'rose', 'image', 'A block with a picture', 'video transcoder'],
  ],
  'Flowchart & generic': [
    ['start', 'Start', 'disc', 'mint', 'play', 'A flat disc with a play mark', 'begin', { R: 1.4, h: 0.5 }],
    ['end', 'End', 'disc', 'rose', 'stop', 'A flat disc with a stop mark', 'finish done', { R: 1.4, h: 0.5 }],
    ['process', 'Process', 'card', 'sky', null, 'A flat card that carries its name', 'task action activity'],
    ['decision', 'Decision', 'tile', 'butter', 'question', 'A flat diamond with a question mark', 'condition choice'],
    ['document', 'Document', 'tile', 'sand', 'doc', 'A flat tile with a page', 'file report form'],
    ['box', 'Box', 'block', 'sand', null, 'A plain block, for anything not listed', 'block generic component'],
    ['cylinder', 'Cylinder', 'drum', 'sand', null, 'A plain tall cylinder', ''],
    ['plate', 'Plate', 'disc', 'sand', null, 'A plain flat disc', '', { R: 1.5, h: 0.6 }],
    ['tile', 'Tile', 'tile', 'sand', null, 'A plain flat tile', ''],
  ],
  Annotate: [
    ['zone', 'Zone', 'zone', 'sky', null, 'A tinted area on the ground', ''],
    ['note', 'Note', 'note', 'sand', null, 'A free-standing label', ''],
  ],
};

export const KINDS = {};
for (const [group, rows] of Object.entries(table))
  for (const [id, name, shape, tone, icon, desc, aka, extra] of rows)
    KINDS[id] = { name, group, shape, tone, icon: icon || undefined, desc, aka: aka ? aka.split(' ') : [], ...extra };

/** Kinds that are real blocks (not zones or notes). */
export const BLOCK_KINDS = Object.keys(KINDS).filter(k => k !== 'zone' && k !== 'note');

/** Other names people reach for, each mapped to a real kind. */
export const ALIASES = {};
for (const id of BLOCK_KINDS) for (const a of KINDS[id].aka) ALIASES[a] = id;

/** Shapes that can show an icon. */
export const ICON_SHAPES = new Set(['block', 'drum', 'disc', 'switch', 'tile', 'rack', 'cloud', 'card']);

/** Half extents on the ground (ax, ay) and height h, in grid units. */
export function footprint(n) {
  const k = KINDS[n.kind];
  switch (k.shape) {
    case 'block': return { ax: 1.5, ay: 1.5, h: 2.3 };
    case 'drum': return { ax: 1.7, ay: 1.7, h: 2.3 };
    case 'disc': return { ax: k.R, ay: k.R, h: k.h };
    case 'switch': return { ax: 1.8, ay: 1.2, h: 0.75 };
    case 'wall': return { ax: 1.7, ay: 0.5, h: 2.4 };
    case 'tile': return { ax: 1.5, ay: 1.5, h: 0.55 };
    case 'rack': return { ax: 1.25, ay: 1.25, h: 3.7 };
    case 'cloud': return { ax: 1.7, ay: 1.7, h: 1 };
    case 'card': return { ax: 2.8, ay: 2.8, h: 0.5 };
    case 'tower': return { ax: 0.9, ay: 0.9, h: 0.3 };
    case 'note': return { ax: 0, ay: 0, h: 0 };
    default: return { ax: 1.9, ay: 1.9, h: 0.4 }; // the slab under laptops, desktops, people and phones
  }
}
