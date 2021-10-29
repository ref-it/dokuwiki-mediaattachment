<?php
/**
 * DokuWiki Plugin mediaattachment (Action Component)
 *
 * @license GPL 2 http://www.gnu.org/licenses/gpl-2.0.html
 * @author  Michael Braun <michael-dev@fami-braun.de>
 */

// must be run within Dokuwiki
if (!defined('DOKU_INC')) die();

if (!defined('DOKU_LF')) define('DOKU_LF', "\n");
if (!defined('DOKU_TAB')) define('DOKU_TAB', "\t");
if (!defined('DOKU_PLUGIN')) define('DOKU_PLUGIN',DOKU_INC.'lib/plugins/');

require_once DOKU_PLUGIN.'action.php';

class action_plugin_mediaattachment_mediaattachment extends DokuWiki_Action_Plugin {

    private $privatens = null;

    public function register(Doku_Event_Handler $controller) {
        $this->privatens = cleanID(trim($this->getConf('privatens')));
        $controller->register_hook('TPL_METAHEADER_OUTPUT', 'BEFORE', $this, 'handle_tpl_metaheader_output');
        $controller->register_hook('AJAX_CALL_UNKNOWN', 'BEFORE', $this, 'handle_ajax');
        $controller->register_hook('TPL_CONTENT_DISPLAY', 'BEFORE', $this, 'handle_tpl_content_display');
    }

    public function handle_ajax(&$event, $param) {
        if (class_exists("action_plugin_ipgroup")) {
          $plugin = new action_plugin_ipgroup();
          $plugin->start($event, $param);
        }

        $call = $event->data;
        if(method_exists($this, "handle_ajax_$call")) {
           $json = new JSON();

           header('Content-Type: application/json');
           try {
             $ret = $this->{"handle_ajax_$call"}();
           } catch (Exception $e) {
             $ret = Array("file" => __FILE__, "line" => __LINE__, "error" => $e->getMessage(), "trace" => $e->getTraceAsString(), "url" => $this->ep_url);
           }
           print $json->encode($ret);
           $event->preventDefault();
        }
    }

    private function handle_ajax_mediaattachment_listfiles() {
        global $INPUT, $conf;

        $NS = cleanID($INPUT->post->str('ns'));
        if(empty($NS)) return Array();

        $nslist = Array($NS);
        if (stripos($NS, ":{$this->privatens}:") !== false) {
          $nslist[] = str_ireplace(":{$this->privatens}:", ":", $NS);
        }
        $ret = Array();
        foreach ($nslist as $NS) {
          $dir = utf8_encode(str_replace(':','/', $NS));
          if(!@is_dir($conf['mediadir'] . '/' . $dir)) continue;
          if(auth_quickaclcheck($dir) < AUTH_READ) continue;
          $res = array(); // search result
          require_once(DOKU_INC.'inc/search.php');
          search($res,$conf['mediadir'],'search_media',array("depth" => 1),$dir);
          foreach ($res as &$r) {
            $r["link"] = ml($r["id"], "", true);
          }
          $ret = array_merge($ret, $res);
        }

        return Array("files" => $ret, "ns" => $nslist);
    }

    private function handle_ajax_mediaattachment_deletefile() {
        global $INPUT, $conf, $lang;
        $DEL = cleanID($INPUT->str('delete'));
        $NS  = getNS($DEL);
        $AUTH = auth_quickaclcheck("$NS:*");
        $res = 0;
        if(checkSecurityToken()) {
            $res = media_delete($DEL,$AUTH);
        }
        if ($res & DOKU_MEDIA_DELETED) {
            $msg = sprintf($lang['deletesucc'], noNS($DEL));
        } elseif ($res & DOKU_MEDIA_INUSE) {
            $msg = sprintf($lang['mediainuse'],noNS($DEL));
        } else {
            $msg = sprintf($lang['deletefail'],noNS($DEL));
        }
        return Array("msg" => $msg);
    }

    public function handle_tpl_metaheader_output(Doku_Event &$event, $param) {
        global $ACT, $INFO;

        if (!in_array($ACT, array('edit', 'create', 'preview',
                                  'locked', 'draft', 'recover'))) {
            return;
        }
        $config = array(
            'id' => $INFO['id'],
            'rev' => (($INFO['rev'] == '') ? $INFO['lastmod'] : $INFO['rev']),
            'base' => DOKU_BASE.'lib/plugins/mediaattachment/',
            'act' => $ACT
        );
        $path = 'scripts/mediaattachment.js';

        $json = new JSON();
        $this->include_script($event, 'var mediaattachment_config = '.$json->encode($config));
        $this->link_script($event, DOKU_BASE.'lib/plugins/mediaattachment/'.$path);

    }

    private function include_script($event, $code) {
        $event->data['script'][] = array(
            'type' => 'text/javascript',
            'charset' => 'utf-8',
            '_data' => $code,
        );
    }

    private function link_script($event, $url) {
        $event->data['script'][] = array(
            'type' => 'text/javascript',
            'charset' => 'utf-8',
            'src' => $url,
            'defer' => true
        );
    }

    public function handle_tpl_content_display(Doku_Event &$event, $param) {
      $event->data .= "<div id=\"mediaattachment\"></div>";
    }
}

// vim:ts=4:sw=4:et:
