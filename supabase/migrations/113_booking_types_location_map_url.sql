-- Separate field for an explicit Google Maps link, distinct from location_text
-- (the meeting point's display name, e.g. "Treptower Park"). The link is used
-- for the "open in Google Maps" action; location_text is also used to build
-- the embedded mini-map preview on the booking page.
ALTER TABLE booking_types ADD COLUMN IF NOT EXISTS location_map_url text;
