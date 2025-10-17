<?php

require_once __DIR__ . '/includes/Maintenance.php';

use MediaWiki\MediaWikiServices;
use MediaWiki\User\User;

class CreateInitialPages extends Maintenance {
    public function __construct() {
        parent::__construct();
        $this->addDescription( 'Create initial pages for 업무' );
    }

    public function execute() {
        $user = User::newSystemUser( 'Maintenance script', [ 'steal' => true ] );
        $categories = [
    '신보험' => [
        'ndbliap1', 'ndbliap2', 'ndbliap3', 'ndbliap4',
        'ndblidb1', 'ndblidb2',
        'ndbliweb1', 'ndbliweb2',
    ],
    '이토피아' => [
        'vmetopiawas1', 'vmetopiawas2', 'vmetopiawas3', 'vmetopiawas4',
        'vmetopiaweb1', 'vmetopiaweb2',
    ],
];

foreach ( $categories as $category => $servers ) {
    // 카테고리 페이지 먼저 생성
    $this->createPage( "Category:$category", "$category 관련 서버들입니다.", $user );

    // 서버 페이지들 생성
    foreach ( $servers as $server ) {
        $content = <<<WIKI
__TOC__  <!-- 목차 표시 위치 고정 -->

<div style="float: right; margin: 1em;">
{| class="wikitable"
|+ '''서버 정보'''
|-
! 항목 !! 내용
|-
| 서버명 || $server
|-
| IP || 
|-
| 운영체제 || 
|-
| 비고 || 
|}
</div>

== 개요 ==
$server 은 $category 업무에 소속된 서버입니다.

== 서비스 구성 ==


== 주요 경로 ==

[[Category:$category]]
WIKI;

        $this->createPage( $server, $content, $user );
    }
}

    }

    private function createPage( $titleText, $contentText, $user ) {
        $title = Title::newFromText( $titleText );
        $wikiPageFactory = MediaWikiServices::getInstance()->getWikiPageFactory();
        $wikiPage = $wikiPageFactory->newFromTitle( $title );
        $content = ContentHandler::makeContent( $contentText, $title );

        $pageUpdater = $wikiPage->newPageUpdater( $user );
        $pageUpdater->setContent( 'main', $content );
        $pageUpdater->saveRevision( CommentStoreComment::newUnsavedComment( '초기 문서 생성' ) );

        $this->output( "생성됨: $titleText\n" );
    }
}

$maintClass = CreateInitialPages::class;
require_once RUN_MAINTENANCE_IF_MAIN;