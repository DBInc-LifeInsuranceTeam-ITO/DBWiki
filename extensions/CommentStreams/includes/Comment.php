<?php
namespace MediaWiki\Extension\CommentStreams;

use FatalError;
use IContextSource;
use MediaWiki\Linker\LinkRenderer;
use MediaWiki\Page\WikiPageFactory;
use MediaWiki\Revision\RevisionStore;
use MediaWiki\User\UserFactory;
use MWException;
use PageProps;
use ParserFactory;
use RepoGroup;
use User;
use Wikimedia\Assert\Assert;
use WikiPage;

class Comment extends AbstractComment {
    private $commentStreamsStore;
    private $echoInterface;
    private $enableVoting;

    /** @var int */
    private $assocPageId;

    /** @var ?string */
    private $commentTitle = null;

    /** @var ?string */
    private $commentBlockName;

    public function __construct(
        CommentStreamsStore $commentStreamsStore,
        EchoInterface $echoInterface,
        SMWInterface $smwInterface,
        SocialProfileInterface $socialProfileInterface,
        LinkRenderer $linkRenderer,
        RepoGroup $repoGroup,
        RevisionStore $revisionStore,
        ParserFactory $parserFactory,
        UserFactory $userFactory,
        PageProps $pageProps,
        WikiPageFactory $wikiPageFactory,
        string $timeFormat,
        ?string $userAvatarPropertyName,
        ?string $userRealNamePropertyName,
        bool $enableVoting,
        WikiPage $wikiPage,
        int $assocPageId,
        ?string $commentTitle,          // ✅ nullable
        ?string $commentBlockName,
        string $wikitext
    ) {
        parent::__construct(
            $smwInterface,
            $socialProfileInterface,
            $linkRenderer,
            $repoGroup,
            $revisionStore,
            $parserFactory,
            $userFactory,
            $pageProps,
            $wikiPageFactory,
            $timeFormat,
            $userAvatarPropertyName,
            $userRealNamePropertyName,
            $wikiPage,
            $wikitext
        );
        $this->commentStreamsStore = $commentStreamsStore;
        $this->echoInterface = $echoInterface;
        $this->enableVoting = $enableVoting;
        $this->assocPageId = $assocPageId;
        $this->commentTitle = $commentTitle ?? null;
        $this->commentBlockName = $commentBlockName;
    }

    public function getAssociatedId(): int {
        return $this->assocPageId;
    }

    public function getCommentTitle(): ?string {
        return $this->commentTitle;
    }

    public function getBlockName(): ?string {
        return $this->commentBlockName;
    }

    public function getNumReplies(): int {
        return $this->commentStreamsStore->getNumReplies( $this->wikiPage->getId() );
    }

    public function getJSON( IContextSource $context ): array {
        $user = $context->getUser();

        $json = [
            'pageid' => $this->wikiPage->getId(),
            'commentblockname' => $this->commentBlockName,
            'associatedid' => $this->assocPageId,
            'commenttitle' => $this->commentTitle ? htmlspecialchars( $this->commentTitle ) : "", // ✅ null 안전
            'wikitext' => htmlspecialchars( $this->wikitext ),
            'html' => $this->getHTML( $context ),
            'username' => $this->getUsername(),
            'numreplies' => $this->getNumReplies(),
            'userdisplayname' => $this->getUserDisplayName(),
            'avatar' => $this->avatar,
            'moderated' => $this->isLastEditModerated() ? "moderated" : null,
			'created' => $this->getCreationDate( $user ),
            'created_timestamp' => $this->creationTimestamp->format( "U" ),
			'modified' => $this->getModificationDate( $user ),
			// ✅ 추가된 부분: 수정 시각을 timestamp로 전달
			'last_edit_timestamp' => $this->modificationTimestamp
				? $this->modificationTimestamp->format( "U" )
				: $this->creationTimestamp->format( "U" ),
        ];

        if ( $this->enableVoting ) {
            $json['numupvotes'] = $this->commentStreamsStore->getNumUpVotes( $this->getId() );
            $json['numdownvotes'] = $this->commentStreamsStore->getNumDownVotes( $this->getId() );
            $json['vote'] = $this->getVote( $user );
        }

        if ( $this->echoInterface->isLoaded() ) {
            $json['watching'] = $this->isWatching( $user ) ? 1 : 0;
        }

        return $json;
    }

    public function vote( string $vote, User $user ): bool {
        Assert::parameter( $vote === "-1" || $vote === "0" || $vote === "1", '$vote',
            'must be "-1", "0", or "1"' );
        $result = $this->commentStreamsStore->vote( (int)$vote, $this->getId(), $user->getId() );
        $this->smwInterface->update( $this->getTitle() );
        return $result;
    }

    public function getVote( User $user ): int {
        return $this->commentStreamsStore->getVote( $this->getId(), $user->getId() );
    }

    public function watch( int $userId ): bool {
        return $this->commentStreamsStore->watch( $this->getId(), $userId );
    }

    public function unwatch( int $userId ): bool {
        return $this->commentStreamsStore->unwatch( $this->getId(), $userId );
    }

    public function isWatching( User $user ): bool {
        return $this->commentStreamsStore->isWatching( $this->getId(), $user->getId() );
    }

    public function update(
        ?string $commentTitle,   // ✅ nullable
        string $wikitext,
        User $user
    ): bool {
        $result = $this->commentStreamsStore->updateComment(
            $this->wikiPage,
            $commentTitle ?? "",
            $wikitext,
            $user
        );
        if ( !$result ) {
            return false;
        }
        $this->commentTitle = $commentTitle ?? null;
        $this->wikitext = $wikitext;
        $this->modificationTimestamp = null;

        $wikiPage = $this->wikiPageFactory->newFromId( $this->wikiPage->getId() );
        if ( $wikiPage ) {
            $this->wikiPage = $wikiPage;
        }
        $this->smwInterface->update( $this->getTitle() );
        return true;
    }

    public function delete( User $deleter ): bool {
        return $this->commentStreamsStore->deleteComment( $this->wikiPage, $deleter );
    }

    public function getReplies(): array {
        return $this->commentStreamsStore->getReplies( $this->getId() );
    }
}
