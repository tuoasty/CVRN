DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT schemaname, tablename, policyname FROM pg_policies
           WHERE schemaname IN ('public', 'storage')
             AND tablename NOT IN ('user_roles', 'pending_users')
             AND (coalesce(qual, '') ILIKE '%user_roles%' OR coalesce(with_check, '') ILIKE '%user_roles%')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION "public"."can_write_media_type"("t" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" = ''
    AS $$
  SELECT "public"."has_group"('admin')
    OR ("public"."has_group"('graphics') AND "t" IN ('gfx', 'totw', 'potw', 'champion', 'feature'))
    OR ("public"."has_group"('media') AND "t" = 'video')
    OR ("public"."has_group"('articles') AND "t" = 'article')
$$;

ALTER FUNCTION "public"."can_write_media_type"("text") OWNER TO "postgres";
REVOKE EXECUTE ON FUNCTION "public"."can_write_media_type"("text") FROM "anon", "public";
GRANT EXECUTE ON FUNCTION "public"."can_write_media_type"("text") TO "authenticated", "service_role";

CREATE POLICY "admin insert matches" ON "public"."matches"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin update matches" ON "public"."matches"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')))
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin delete matches" ON "public"."matches"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_group"('super_admin')) OR ((SELECT "public"."has_group"('admin')) AND "status" <> 'completed'));

CREATE POLICY "admin insert match_sets" ON "public"."match_sets"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin update match_sets" ON "public"."match_sets"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')))
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin delete match_sets" ON "public"."match_sets"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin insert match_officials" ON "public"."match_officials"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin update match_officials" ON "public"."match_officials"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')))
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin delete match_officials" ON "public"."match_officials"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin insert playoff_brackets" ON "public"."playoff_brackets"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin update playoff_brackets" ON "public"."playoff_brackets"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')))
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin delete playoff_brackets" ON "public"."playoff_brackets"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin insert playoff_configs" ON "public"."playoff_configs"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin update playoff_configs" ON "public"."playoff_configs"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')))
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin delete playoff_configs" ON "public"."playoff_configs"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin insert player_team_seasons" ON "public"."player_team_seasons"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin update player_team_seasons" ON "public"."player_team_seasons"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')))
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin delete player_team_seasons" ON "public"."player_team_seasons"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin insert game_datasets" ON "public"."game_datasets"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin update game_datasets" ON "public"."game_datasets"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')))
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin delete game_datasets" ON "public"."game_datasets"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin insert game_spec_skips" ON "public"."game_spec_skips"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin update game_spec_skips" ON "public"."game_spec_skips"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')))
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin delete game_spec_skips" ON "public"."game_spec_skips"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin select update_log_images" ON "public"."update_log_images"
  FOR SELECT TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin insert update_log_images" ON "public"."update_log_images"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin update update_log_images" ON "public"."update_log_images"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')))
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin delete update_log_images" ON "public"."update_log_images"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin insert sheet_sync_logs" ON "public"."sheet_sync_logs"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin delete sheet_sync_logs" ON "public"."sheet_sync_logs"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin, statistics insert player_match_stats" ON "public"."player_match_stats"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','statistics']::"public"."access_group"[])));

CREATE POLICY "admin, statistics update player_match_stats" ON "public"."player_match_stats"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','statistics']::"public"."access_group"[])))
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','statistics']::"public"."access_group"[])));

CREATE POLICY "admin, statistics delete player_match_stats" ON "public"."player_match_stats"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','statistics']::"public"."access_group"[])));

CREATE POLICY "admin, statistics insert match_sheet_config" ON "public"."match_sheet_config"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','statistics']::"public"."access_group"[])));

CREATE POLICY "admin, statistics update match_sheet_config" ON "public"."match_sheet_config"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','statistics']::"public"."access_group"[])))
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','statistics']::"public"."access_group"[])));

CREATE POLICY "admin, statistics delete match_sheet_config" ON "public"."match_sheet_config"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','statistics']::"public"."access_group"[])));

CREATE POLICY "media writers insert media_posts" ON "public"."media_posts"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."can_write_media_type"("type")));

CREATE POLICY "media writers update media_posts" ON "public"."media_posts"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."can_write_media_type"("type")))
  WITH CHECK ((SELECT "public"."can_write_media_type"("type")));

CREATE POLICY "admin, articles delete media_posts" ON "public"."media_posts"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')) OR ((SELECT "public"."has_group"('articles')) AND "type" = 'article'));

CREATE POLICY "admin, articles select articles" ON "public"."articles"
  FOR SELECT TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','articles']::"public"."access_group"[])));

CREATE POLICY "admin, articles insert articles" ON "public"."articles"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_group"('admin')) OR ((SELECT "public"."has_group"('articles')) AND "published_at" IS NULL));

CREATE POLICY "admin, articles update articles" ON "public"."articles"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','articles']::"public"."access_group"[])))
  WITH CHECK ((SELECT "public"."has_group"('admin')) OR "published_at" IS NULL);

CREATE POLICY "super_admin delete articles" ON "public"."articles"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_group"('super_admin')));

CREATE POLICY "admin, articles insert article_media" ON "public"."article_media"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','articles']::"public"."access_group"[])));

CREATE POLICY "admin, articles update article_media" ON "public"."article_media"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','articles']::"public"."access_group"[])))
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','articles']::"public"."access_group"[])));

CREATE POLICY "admin, articles delete article_media" ON "public"."article_media"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','articles']::"public"."access_group"[])));

CREATE POLICY "admin select update_logs" ON "public"."update_logs"
  FOR SELECT TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin insert update_logs" ON "public"."update_logs"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin update update_logs" ON "public"."update_logs"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')))
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "super_admin delete update_logs" ON "public"."update_logs"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_group"('super_admin')));

CREATE POLICY "admin insert teams" ON "public"."teams"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin update teams" ON "public"."teams"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')))
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "super_admin delete teams" ON "public"."teams"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_group"('super_admin')));

CREATE POLICY "admin insert regions" ON "public"."regions"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin update regions" ON "public"."regions"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')))
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "super_admin delete regions" ON "public"."regions"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_group"('super_admin')));

CREATE POLICY "admin insert seasons" ON "public"."seasons"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin update seasons" ON "public"."seasons"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')))
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "super_admin delete seasons" ON "public"."seasons"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_group"('super_admin')));

CREATE POLICY "admin insert sheet_configs" ON "public"."sheet_configs"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin update sheet_configs" ON "public"."sheet_configs"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')))
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "super_admin delete sheet_configs" ON "public"."sheet_configs"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_group"('super_admin')));

CREATE POLICY "admin insert players" ON "public"."players"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin update players" ON "public"."players"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_group"('admin')))
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "super_admin delete players" ON "public"."players"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_group"('super_admin')));

CREATE POLICY "admin insert team_name_history" ON "public"."team_name_history"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "super_admin delete team_name_history" ON "public"."team_name_history"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_group"('super_admin')));

CREATE POLICY "admin, awards insert season_awards" ON "public"."season_awards"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','awards']::"public"."access_group"[])));

CREATE POLICY "admin, awards update season_awards" ON "public"."season_awards"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','awards']::"public"."access_group"[])))
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','awards']::"public"."access_group"[])));

CREATE POLICY "admin, awards delete season_awards" ON "public"."season_awards"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','awards']::"public"."access_group"[])));

CREATE POLICY "admin, awards insert season_all_star_teams" ON "public"."season_all_star_teams"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','awards']::"public"."access_group"[])));

CREATE POLICY "admin, awards update season_all_star_teams" ON "public"."season_all_star_teams"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','awards']::"public"."access_group"[])))
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','awards']::"public"."access_group"[])));

CREATE POLICY "admin, awards delete season_all_star_teams" ON "public"."season_all_star_teams"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','awards']::"public"."access_group"[])));

CREATE POLICY "admin, awards insert season_podium" ON "public"."season_podium"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','awards']::"public"."access_group"[])));

CREATE POLICY "admin, awards update season_podium" ON "public"."season_podium"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','awards']::"public"."access_group"[])))
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','awards']::"public"."access_group"[])));

CREATE POLICY "admin, awards delete season_podium" ON "public"."season_podium"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','awards']::"public"."access_group"[])));

CREATE POLICY "admin, awards insert award_names" ON "public"."award_names"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','awards']::"public"."access_group"[])));

CREATE POLICY "admin, specs insert specs" ON "public"."specs"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','specs']::"public"."access_group"[])));

CREATE POLICY "admin, specs update specs" ON "public"."specs"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','specs']::"public"."access_group"[])))
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','specs']::"public"."access_group"[])));

CREATE POLICY "super_admin delete specs" ON "public"."specs"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_group"('super_admin')));

CREATE POLICY "admin, specs select spec_requirements" ON "public"."spec_requirements"
  FOR SELECT TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','specs']::"public"."access_group"[])));

CREATE POLICY "admin, specs insert spec_requirements" ON "public"."spec_requirements"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','specs']::"public"."access_group"[])));

CREATE POLICY "admin, specs update spec_requirements" ON "public"."spec_requirements"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','specs']::"public"."access_group"[])))
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','specs']::"public"."access_group"[])));

CREATE POLICY "admin, specs delete spec_requirements" ON "public"."spec_requirements"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','specs']::"public"."access_group"[])));

CREATE POLICY "admin, specs select spec_region_rules" ON "public"."spec_region_rules"
  FOR SELECT TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','specs']::"public"."access_group"[])));

CREATE POLICY "admin, specs insert spec_region_rules" ON "public"."spec_region_rules"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','specs']::"public"."access_group"[])));

CREATE POLICY "admin, specs update spec_region_rules" ON "public"."spec_region_rules"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','specs']::"public"."access_group"[])))
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','specs']::"public"."access_group"[])));

CREATE POLICY "admin, specs delete spec_region_rules" ON "public"."spec_region_rules"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','specs']::"public"."access_group"[])));

CREATE POLICY "admin, specs all spec_bonuses" ON "public"."spec_bonuses"
  FOR ALL TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','specs']::"public"."access_group"[])))
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','specs']::"public"."access_group"[])));

CREATE POLICY "admin, specs all spec_winners" ON "public"."spec_winners"
  FOR ALL TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','specs']::"public"."access_group"[])))
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','specs']::"public"."access_group"[])));

CREATE POLICY "admin, specs all public_spec_snapshot" ON "public"."public_spec_snapshot"
  FOR ALL TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','specs']::"public"."access_group"[])))
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','specs']::"public"."access_group"[])));

CREATE POLICY "admin, information insert game_terms" ON "public"."game_terms"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','information']::"public"."access_group"[])));

CREATE POLICY "admin, information update game_terms" ON "public"."game_terms"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','information']::"public"."access_group"[])))
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','information']::"public"."access_group"[])));

CREATE POLICY "admin, information delete game_terms" ON "public"."game_terms"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','information']::"public"."access_group"[])));

CREATE POLICY "admin, information insert game_ability_settings" ON "public"."game_ability_settings"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','information']::"public"."access_group"[])));

CREATE POLICY "admin, information update game_ability_settings" ON "public"."game_ability_settings"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','information']::"public"."access_group"[])))
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','information']::"public"."access_group"[])));

CREATE POLICY "admin, information delete game_ability_settings" ON "public"."game_ability_settings"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','information']::"public"."access_group"[])));

CREATE POLICY "admin, player_cards select overall_scalings" ON "public"."overall_scalings"
  FOR SELECT TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','player_cards']::"public"."access_group"[])));

CREATE POLICY "admin, player_cards insert overall_scalings" ON "public"."overall_scalings"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','player_cards']::"public"."access_group"[])));

CREATE POLICY "admin, player_cards update overall_scalings" ON "public"."overall_scalings"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','player_cards']::"public"."access_group"[])))
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','player_cards']::"public"."access_group"[])));

CREATE POLICY "admin, player_cards delete overall_scalings" ON "public"."overall_scalings"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','player_cards']::"public"."access_group"[])));

CREATE POLICY "admin, player_cards select player_overalls" ON "public"."player_overalls"
  FOR SELECT TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','player_cards']::"public"."access_group"[])));

CREATE POLICY "admin, player_cards insert player_overalls" ON "public"."player_overalls"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','player_cards']::"public"."access_group"[])));

CREATE POLICY "admin, player_cards update player_overalls" ON "public"."player_overalls"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','player_cards']::"public"."access_group"[])))
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','player_cards']::"public"."access_group"[])));

CREATE POLICY "admin, player_cards delete player_overalls" ON "public"."player_overalls"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','player_cards']::"public"."access_group"[])));

CREATE POLICY "admin, player_cards insert player_cards" ON "public"."player_cards"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','player_cards']::"public"."access_group"[])));

CREATE POLICY "admin, player_cards update player_cards" ON "public"."player_cards"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','player_cards']::"public"."access_group"[])))
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','player_cards']::"public"."access_group"[])));

CREATE POLICY "admin, player_cards delete player_cards" ON "public"."player_cards"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','player_cards']::"public"."access_group"[])));

CREATE POLICY "admin, player_cards insert player_card_overlays" ON "public"."player_card_overlays"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','player_cards']::"public"."access_group"[])));

CREATE POLICY "admin, player_cards update player_card_overlays" ON "public"."player_card_overlays"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','player_cards']::"public"."access_group"[])))
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','player_cards']::"public"."access_group"[])));

CREATE POLICY "admin, player_cards delete player_card_overlays" ON "public"."player_card_overlays"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','player_cards']::"public"."access_group"[])));

CREATE POLICY "admin, player_cards insert card_groups" ON "public"."card_groups"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','player_cards']::"public"."access_group"[])));

CREATE POLICY "admin, player_cards update card_groups" ON "public"."card_groups"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','player_cards']::"public"."access_group"[])))
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','player_cards']::"public"."access_group"[])));

CREATE POLICY "super_admin delete card_groups" ON "public"."card_groups"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_group"('super_admin')));

CREATE POLICY "admin, player_cards insert card_templates" ON "public"."card_templates"
  FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','player_cards']::"public"."access_group"[])));

CREATE POLICY "admin, player_cards update card_templates" ON "public"."card_templates"
  FOR UPDATE TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','player_cards']::"public"."access_group"[])))
  WITH CHECK ((SELECT "public"."has_any_group"(ARRAY['admin','player_cards']::"public"."access_group"[])));

CREATE POLICY "super_admin delete card_templates" ON "public"."card_templates"
  FOR DELETE TO "authenticated"
  USING ((SELECT "public"."has_group"('super_admin')));

CREATE POLICY "admin, player_cards select card_bulk_jobs" ON "public"."card_bulk_jobs"
  FOR SELECT TO "authenticated"
  USING ((SELECT "public"."has_any_group"(ARRAY['admin','player_cards']::"public"."access_group"[])));

CREATE POLICY "staff insert objects" ON "storage"."objects"
  FOR INSERT TO "authenticated"
  WITH CHECK ("bucket_id" = 'public-assets' AND (SELECT "public"."has_any_group"(ARRAY['admin','transaction','graphics','media','articles','information','specs','player_cards','awards']::"public"."access_group"[])));

CREATE POLICY "staff update objects" ON "storage"."objects"
  FOR UPDATE TO "authenticated"
  USING ("bucket_id" = 'public-assets' AND (SELECT "public"."has_any_group"(ARRAY['admin','transaction','graphics','media','articles','information','specs','player_cards','awards']::"public"."access_group"[])))
  WITH CHECK ("bucket_id" = 'public-assets' AND (SELECT "public"."has_any_group"(ARRAY['admin','transaction','graphics','media','articles','information','specs','player_cards','awards']::"public"."access_group"[])));

CREATE POLICY "super_admin delete objects" ON "storage"."objects"
  FOR DELETE TO "authenticated"
  USING ("bucket_id" = 'public-assets' AND (SELECT "public"."has_group"('super_admin')));

CREATE OR REPLACE FUNCTION "public"."save_spec_facts"("p_spec_id" "uuid", "p_stars" integer, "p_position" "text") RETURNS "public"."specs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" = ''
    AS $$
DECLARE
  v_spec public.specs;
BEGIN
  IF NOT public.has_any_group(ARRAY['admin', 'information']::public.access_group[]) THEN
    RAISE EXCEPTION 'not allowed to edit spec facts' USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.specs
     SET stars = p_stars,
         position = p_position,
         updated_at = now()
   WHERE id = p_spec_id
  RETURNING * INTO v_spec;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'spec not found' USING ERRCODE = 'no_data_found';
  END IF;

  RETURN v_spec;
END;
$$;

ALTER FUNCTION "public"."save_spec_facts"("uuid", integer, "text") OWNER TO "postgres";
REVOKE EXECUTE ON FUNCTION "public"."save_spec_facts"("uuid", integer, "text") FROM "anon", "public";
GRANT EXECUTE ON FUNCTION "public"."save_spec_facts"("uuid", integer, "text") TO "authenticated", "service_role";

CREATE OR REPLACE FUNCTION "public"."refresh_records"()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT "public"."has_any_group"(ARRAY['admin', 'statistics']::"public"."access_group"[]) THEN
        RAISE EXCEPTION 'not authorized to refresh records' USING ERRCODE = '42501';
    END IF;

    REFRESH MATERIALIZED VIEW CONCURRENTLY "public"."mv_records";
END;
$$;

CREATE OR REPLACE FUNCTION "public"."bump_cache_version"("p_tag" "text") RETURNS void
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" = ''
    AS $$
begin
  if auth.role() <> 'service_role'
     and not public.has_any_group(array['admin', 'statistics']::public.access_group[]) then
    raise exception 'not allowed to bump cache versions' using errcode = 'insufficient_privilege';
  end if;

  insert into public.cache_versions (tag)
  values (p_tag)
  on conflict (tag) do update
    set version = public.cache_versions.version + 1,
        updated_at = now();
end;
$$;

ALTER TABLE "public"."articles" ALTER COLUMN "created_by" DROP NOT NULL;
ALTER TABLE "public"."articles" DROP CONSTRAINT IF EXISTS "articles_created_by_fkey";
ALTER TABLE "public"."articles" ADD CONSTRAINT "articles_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE "public"."media_posts" ALTER COLUMN "created_by" DROP NOT NULL;
ALTER TABLE "public"."media_posts" DROP CONSTRAINT IF EXISTS "media_posts_created_by_fkey";
ALTER TABLE "public"."media_posts" ADD CONSTRAINT "media_posts_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE "public"."update_logs" ALTER COLUMN "created_by" DROP NOT NULL;
ALTER TABLE "public"."update_logs" DROP CONSTRAINT IF EXISTS "update_logs_created_by_fkey";
ALTER TABLE "public"."update_logs" ADD CONSTRAINT "update_logs_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE "public"."game_datasets" ALTER COLUMN "imported_by" DROP NOT NULL;
ALTER TABLE "public"."game_datasets" DROP CONSTRAINT IF EXISTS "game_datasets_imported_by_fkey";
ALTER TABLE "public"."game_datasets" ADD CONSTRAINT "game_datasets_imported_by_fkey"
  FOREIGN KEY ("imported_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE "public"."season_awards" DROP CONSTRAINT IF EXISTS "season_awards_created_by_fkey";
ALTER TABLE "public"."season_awards" ADD CONSTRAINT "season_awards_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
DROP FUNCTION IF EXISTS "public"."assign_role_from_invite"();
DROP FUNCTION IF EXISTS "public"."add_to_pending_users"();
DROP FUNCTION IF EXISTS "public"."get_user_role"("uuid");
DROP FUNCTION IF EXISTS "public"."has_role"("uuid");

DROP TABLE IF EXISTS "public"."pending_users";
DROP TABLE IF EXISTS "public"."user_roles";
