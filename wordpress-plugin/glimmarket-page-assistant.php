<?php
/**
 * Plugin Name: GlimMarket Page Assistant
 * Description: Page-aware assistant widget (summary, takeaways, Q&A).
 * Version: 0.1.1
 */

// Backend API base URL must be defined by the site owner.
// Example (in wp-config.php):
// define('GM_PA_API_BASE', 'https://api.glimmarket.com');

if (!defined('ABSPATH')) exit;

define('GM_PA_VERSION', '0.1.1');

function gm_pa_should_load() {
  return is_singular();
}

function gm_pa_enqueue_assets() {
  if (!gm_pa_should_load()) return;

  wp_enqueue_style(
    'gm-pa-css',
    plugin_dir_url(__FILE__) . 'assets/gm-pa.css',
    [],
    GM_PA_VERSION
  );

  wp_enqueue_script(
    'gm-pa-js',
    plugin_dir_url(__FILE__) . 'assets/gm-pa.js',
    [],
    GM_PA_VERSION,
    true
  );

  global $post;
  if (!$post || empty($post->ID)) return;

  $api_base = defined('GM_PA_API_BASE') ? GM_PA_API_BASE : '';

  $config = [
    'apiBase' => esc_url_raw($api_base),
    'pageId'  => (int) $post->ID,
    'title'   => get_the_title($post),
    'url'     => get_permalink($post),
  ];

  wp_add_inline_script(
    'gm-pa-js',
    'window.GM_PA=' . wp_json_encode($config) . ';',
    'before'
  );
}
add_action('wp_enqueue_scripts', 'gm_pa_enqueue_assets');

function gm_pa_render_container() {
  if (!gm_pa_should_load()) return;
  echo '<div id="gm-pa-root"></div>';
}
add_action('wp_footer', 'gm_pa_render_container');