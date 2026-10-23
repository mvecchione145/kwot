-- Users: identity lives in Keycloak; this table holds the kwōt-specific profile.
CREATE TYPE user_role AS ENUM ('customer', 'servicer');

CREATE TABLE users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keycloak_id text NOT NULL UNIQUE,
  email       text NOT NULL,
  name        text,
  role        user_role,           -- chosen once during onboarding, then immutable
  zip         text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Service categories and the follow-up questions each one asks (form and chat).
-- questions: [{ id, prompt, type, options?, required }]
--   type: single_choice | multi_choice | number | date | text | yes_no
CREATE TABLE categories (
  slug       text PRIMARY KEY,
  name       text NOT NULL,
  questions  jsonb NOT NULL DEFAULT '[]',
  sort_order int NOT NULL DEFAULT 0
);

INSERT INTO categories (slug, name, sort_order, questions) VALUES
('irrigation', 'Irrigation', 10, '[
  {"id": "yard_size", "prompt": "About how big is your yard?", "type": "single_choice", "options": ["Small (under 1/4 acre)", "Medium (1/4 to 1/2 acre)", "Large (over 1/2 acre)", "Not sure"], "required": true},
  {"id": "zones", "prompt": "How many zones does your system have?", "type": "number", "required": true},
  {"id": "last_serviced", "prompt": "When was the system last serviced?", "type": "single_choice", "options": ["Within the last year", "1-2 years ago", "More than 2 years ago", "Never / not sure"], "required": true},
  {"id": "known_issues", "prompt": "Any known leaks or broken sprinkler heads?", "type": "yes_no", "required": false}
]'),
('lawn-care', 'Lawn Care', 20, '[
  {"id": "yard_size", "prompt": "About how big is your lawn?", "type": "single_choice", "options": ["Small (under 1/4 acre)", "Medium (1/4 to 1/2 acre)", "Large (over 1/2 acre)", "Not sure"], "required": true},
  {"id": "services", "prompt": "Which services do you need?", "type": "multi_choice", "options": ["Mowing", "Edging", "Fertilizing", "Aeration", "Weed control", "Leaf cleanup"], "required": true},
  {"id": "frequency", "prompt": "How often?", "type": "single_choice", "options": ["One time", "Weekly", "Every other week", "Monthly"], "required": true}
]'),
('plumbing', 'Plumbing', 30, '[
  {"id": "issue", "prompt": "What is the problem?", "type": "single_choice", "options": ["Leak", "Clog", "No hot water", "Install / replace a fixture", "Other"], "required": true},
  {"id": "location", "prompt": "Where in the home?", "type": "text", "required": true},
  {"id": "urgent", "prompt": "Is water actively leaking right now?", "type": "yes_no", "required": true}
]'),
('hvac', 'Heating & Cooling', 40, '[
  {"id": "system_type", "prompt": "What kind of system?", "type": "single_choice", "options": ["Central AC", "Furnace", "Heat pump", "Mini-split", "Not sure"], "required": true},
  {"id": "issue", "prompt": "What do you need?", "type": "single_choice", "options": ["Not working", "Routine maintenance", "Strange noise or smell", "Replacement quote"], "required": true},
  {"id": "system_age", "prompt": "Roughly how old is the system (years)?", "type": "number", "required": false}
]'),
('cleaning', 'Cleaning', 50, '[
  {"id": "home_size", "prompt": "How many bedrooms and bathrooms?", "type": "text", "required": true},
  {"id": "cleaning_type", "prompt": "What kind of cleaning?", "type": "single_choice", "options": ["Standard", "Deep clean", "Move in / move out"], "required": true},
  {"id": "frequency", "prompt": "How often?", "type": "single_choice", "options": ["One time", "Weekly", "Every other week", "Monthly"], "required": true}
]'),
('other', 'Other', 1000, '[]');
