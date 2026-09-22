-- ============================================================================
-- 0018_trip_cover.sql — a trip's chosen destination cover photo.
-- Run in the Supabase SQL Editor after 0017_account_lifecycle.sql.
--
-- Stores the one photo the owner picked (never a search result list), plus
-- the attribution the provider's terms ask for: photographer, their profile,
-- and the photo's page. All nullable — a trip without a cover uses the app's
-- own default image. No new policy: 0002's trips_update_own already limits
-- every column, these included, to the trip's owner.
--
-- The URL check pins covers to the one image host next.config.ts allows,
-- so a hand-crafted API call can't make other trip members' browsers (via the
-- image optimizer) fetch an arbitrary URL. Swapping providers means
-- replacing this constraint in a new migration — deliberately explicit.
-- ============================================================================
begin;

alter table public.trips
  add column cover_image_url text,
  add column cover_image_alt text,
  add column cover_provider text,
  add column cover_photographer text,
  add column cover_photographer_url text,
  add column cover_source_url text;

alter table public.trips
  add constraint trips_cover_image_url_host check (
    cover_image_url is null
    or cover_image_url ~ '^https://images\.pexels\.com/photos/[0-9]+/[A-Za-z0-9._-]+\?auto=compress&cs=tinysrgb&w=1600$'
  ),
  add constraint trips_cover_provider_known check (cover_provider is null or cover_provider = 'pexels'),
  -- Attribution links are shown to every trip member, so they may only point
  -- at the provider's own site, never an arbitrary (e.g. phishing) page.
  add constraint trips_cover_links_provider check (
    (cover_photographer_url is null or cover_photographer_url ~ '^https://(www\.)?pexels\.com/')
    and (cover_source_url is null or cover_source_url ~ '^https://(www\.)?pexels\.com/')
  ),
  add constraint trips_cover_lengths check (
    char_length(coalesce(cover_image_url, '')) <= 500
    and char_length(coalesce(cover_image_alt, '')) <= 300
    and char_length(coalesce(cover_photographer, '')) <= 120
    and char_length(coalesce(cover_photographer_url, '')) <= 500
    and char_length(coalesce(cover_source_url, '')) <= 500
  ),
  -- A cover is all-or-nothing: an image without its attribution isn't allowed.
  add constraint trips_cover_complete check (
    (cover_image_url is null) = (cover_provider is null)
    and (cover_image_url is null) = (cover_photographer is null)
    and (cover_image_url is null) = (cover_source_url is null)
  );

commit;
