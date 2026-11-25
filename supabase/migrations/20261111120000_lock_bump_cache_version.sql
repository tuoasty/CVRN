CREATE OR REPLACE FUNCTION "public"."bump_cache_version"("p_tag" "text") RETURNS void
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" = ''
    AS $$
begin
  if auth.role() <> 'service_role' and not exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('admin', 'super_admin', 'stat_tracker')
  ) then
    raise exception 'not allowed to bump cache versions' using errcode = 'insufficient_privilege';
  end if;

  insert into public.cache_versions (tag)
  values (p_tag)
  on conflict (tag) do update
    set version = public.cache_versions.version + 1,
        updated_at = now();
end;
$$;

ALTER FUNCTION "public"."bump_cache_version"("p_tag" "text") OWNER TO "postgres";

REVOKE EXECUTE ON FUNCTION "public"."bump_cache_version"("p_tag" "text") FROM "anon", "public";
GRANT EXECUTE ON FUNCTION "public"."bump_cache_version"("p_tag" "text") TO "authenticated", "service_role";
