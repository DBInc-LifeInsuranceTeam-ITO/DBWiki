/*
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

module.exports = ( function () {
	'use strict';

	function Stream( controller, env, block, querier, commentData ) {
		this.controller = controller;
		this.env = env;
		this.block = block;
		this.querier = querier;

		this.$stream = null;
		this.pageId = null;
		this.$headCommentBody = null;
		this.$streamFooter = null;
		this.replyButton = null;
		this.upButton = null;
		this.$upCountSpan = null;
		this.downButton = null;
		this.$downCountSpan = null;
		this.watchButton = null;
		this.collapseButton = null;
		this.streamMenu = null;
		this.replyMenus = [];
		this.collapsed = false;

		this.createStream( commentData );
	}

	Stream.prototype.getStream = function () {
		return this.$stream;
	};

	Stream.prototype.getStreamFooter = function () {
		return this.$streamFooter;
	};

	Stream.prototype.enableButtons = function () {
		this.replyButton.setDisabled( false );
		if ( this.upButton ) {
			this.upButton.setDisabled( false );
		}
		if ( this.downButton ) {
			this.downButton.setDisabled( false );
		}
		this.streamMenu.setDisabled( false );
		this.replyMenus.forEach( function ( replyMenu ) {
			replyMenu.setDisabled( false );
		} );
	};

	Stream.prototype.disableButtons = function () {
		this.replyButton.setDisabled( true );
		if ( this.upButton ) {
			this.upButton.setDisabled( true );
		}
		if ( this.downButton ) {
			this.downButton.setDisabled( true );
		}
		this.streamMenu.setDisabled( true );
		this.replyMenus.forEach( function ( replyMenu ) {
			replyMenu.setDisabled( true );
		} );
	};

	Stream.prototype.createStream = function ( commentData ) {
		const self = this;

		const $headComment = this.createComment( commentData );

		const id = 'cs-comment-' + commentData.pageid;

		this.pageId = commentData.pageid;

		if ( this.env.targetComment === id ) {
			$headComment.addClass( 'cs-target-comment' );
		}

		this.$stream = $( '<div>' )
			.addClass( 'cs-stream' )
			.addClass( 'cs-expanded' )
			.attr( 'data-created-timestamp', commentData.created_timestamp )
			.append( $headComment );

		this.$streamFooter = $( '<div>' )
			.addClass( 'cs-stream-footer' );
		this.$stream.append( this.$streamFooter );

		if ( this.env.canComment ) {
			const params = {
				framed: false
			};

			const buttonText = mw.msg( 'commentstreams-buttontext-reply' );
			if ( this.env.showLabels ) {
				params.label = buttonText;
			} else {
				params.title = buttonText;
			}

			this.replyButton = new OO.ui.ButtonWidget( params );

			this.$streamFooter.append( this.replyButton.$element );

			this.replyButton.onClick = function () {
				self.showNewReplyBox( commentData.pageid );
			};

			this.replyButton.on( 'click', this.replyButton.onClick );
		}
	};
Stream.prototype.showNewReplyBox = function (topCommentId) {
	const self = this;

	this.block.createEditBox(false);
	this.block.$editBox
		.insertBefore(this.$streamFooter)
		.hide()
		.slideDown();

	// ✅ 버튼 새로 만든 OOUI 이벤트 등록
	self.block.submitButton.connect(self, {
		click: function () {
			self.block.postComment(topCommentId);
		}
	});

	self.block.cancelButton.connect(self, {
		click: function () {
			self.block.hideEditBox(true);
		}
	});

	self.block.disableAllButtons();
	this.block.$bodyField.trigger('focus');

	if ($.fn.applyVisualEditor) {
		this.block.$bodyField.applyVisualEditor();
	}
};


	Stream.prototype.addReply = function ( commentData ) {
		const $comment = this.createComment( commentData );
		$comment.insertBefore( this.$streamFooter );
		if ( this.collapsed ) {
			$comment.addClass( 'cs-hidden' );
		}
	};

	Stream.prototype.createComment = function (commentData) {
	const $commentHeader = $('<div>').addClass('cs-comment-header');

	// 왼쪽 영역
	const $leftDiv = $('<div>').addClass('cs-comment-header-left');

	const avatarUrl =
	commentData.avatar && commentData.avatar.length > 0
		? commentData.avatar
		: (document.querySelector('.profile-img')?.src ||
		   '/static/images/default-avatar.png');

	const $avatar = $('<img>')
		.attr('src', avatarUrl)
		.attr('alt', commentData.userdisplayname)
		.addClass('cs-avatar');

	// ✅ 작성 시간 포맷 (UNIX timestamp 사용)
	const formattedCreated = new Date(commentData.created_timestamp * 1000)
		.toLocaleString('ko-KR', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hour12: true // 오전/오후 표시
		});

	// ✅ 수정 시간 (있을 경우)
	let formattedEdited = '';
	if (
		commentData.last_edit_timestamp &&
		commentData.last_edit_timestamp !== commentData.created_timestamp
	) {
		formattedEdited = new Date(commentData.last_edit_timestamp * 1000)
			.toLocaleString('ko-KR', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				hour12: true
			});
	}

	// 작성자 + 시간 블록
	const $authorInfo = $('<div>')
		.addClass('cs-author-info')
		.append($('<span>').addClass('cs-comment-author').text(commentData.userdisplayname));

	const $timeInfo = $('<span>').addClass('cs-comment-details')
		.text(formattedCreated);

	// 수정 시간 추가 (있을 때만)
	if (formattedEdited) {
		$timeInfo.append(
			` <span class="cs-comment-edited">(수정됨: ${formattedEdited})</span>`
		);
	}

	$authorInfo.append($timeInfo);
	$leftDiv.append($avatar).append($authorInfo);
	// 오른쪽 메뉴
	const $rightDiv = $('<div>').addClass('cs-comment-header-right');
	$rightDiv.append(this.createCommentMenu(commentData));

	// 전체 헤더 구성
	$commentHeader.append($leftDiv, $rightDiv);

	// 본문
	const $commentBody = $('<div>')
		.addClass('cs-comment-body')
		.html(commentData.html);

	const $comment = $('<div>').addClass('cs-comment');
	if (commentData.parentid === undefined) {
		$comment.addClass('cs-head-comment');
	} else {
		$comment.addClass('cs-reply-comment');
	}

	$comment.append($commentHeader, $commentBody);
	return $comment;
};


	Stream.prototype.createVotingButtons = function ( commentData ) {
		const self = this;

		const upParams = {
			icon: 'upTriangle',
			title: mw.msg( 'commentstreams-buttontooltip-upvote' ),
			classes: [ 'cs-vote-up-button' ],
			framed: false
		};

		if ( commentData.vote > 0 ) {
			upParams.flags = 'progressive';
		}

		this.upButton = new OO.ui.ButtonWidget( upParams );

		this.$upCountSpan = $( '<span>' )
			.addClass( 'cs-vote-up-count' )
			.text( commentData.numupvotes );
		this.upButton.$element.append( this.$upCountSpan );

		const downParams = {
			icon: 'downTriangle',
			title: mw.msg( 'commentstreams-buttontooltip-downvote' ),
			classes: [ 'cs-vote-down-button' ],
			framed: false
		};

		if ( commentData.vote < 0 ) {
			downParams.flags = 'progressive';
		}

		this.downButton = new OO.ui.ButtonWidget( downParams );

		this.$downCountSpan = $( '<span>' )
			.addClass( 'cs-vote-down-count' )
			.text( commentData.numdownvotes );
		this.downButton.$element.append( this.$downCountSpan );

		const $votingSpan = $( '<span>' )
			.addClass( 'cs-voting-span' );
		$votingSpan.append( this.upButton.$element );
		$votingSpan.append( this.downButton.$element );

		if ( this.env.isLoggedIn ) {
			this.upButton.onClick = function () {
				self.vote( $votingSpan, commentData.pageid, true,
					commentData.created_timestamp );
			};

			this.upButton.on( 'click', this.upButton.onClick );

			this.downButton.onClick = function () {
				self.vote( $votingSpan, commentData.pageid, false,
					commentData.created_timestamp );
			};

			this.downButton.on( 'click', this.downButton.onClick );
		}

		return $votingSpan;
	};

	Stream.prototype.vote = function ( $votingSpan, pageid, up, createdTimestamp ) {
		const self = this;

		let upCount = parseInt( this.$upCountSpan.text() );
		let downCount = parseInt( this.$downCountSpan.text() );

		let newvote;
		if ( up ) {
			if ( this.upButton.hasFlag( 'progressive' ) ) {
				newvote = 0;
			} else {
				newvote = 1;
			}
		} else {
			if ( self.downButton.hasFlag( 'progressive' ) ) {
				newvote = 0;
			} else {
				newvote = -1;
			}
		}

		this.block.disableAllButtons();
		const progressBar = new OO.ui.ProgressBarWidget( {
			progress: false
		} );
		//progressBar.$element.insertBefore( this.$headCommentBody );
		this.$headCommentBody.after(
			$('<div class="cs-progress-wrapper"></div>')
				.append(progressBar.$element)
		);
		this.querier.vote( pageid, newvote, function ( result ) {
			progressBar.$element.remove();
			if ( result === undefined ) {
				if ( up ) {
					if ( self.upButton.hasFlag( 'progressive' ) ) {
						self.upButton.clearFlags();
						upCount = upCount - 1;
						self.$upCountSpan.text( upCount );
					} else {
						self.upButton.setFlags( 'progressive' );
						upCount = upCount + 1;
						self.$upCountSpan.text( upCount );
						if ( self.downButton.hasFlag( 'progressive' ) ) {
							self.downButton.clearFlags();
							downCount = downCount - 1;
							self.$downCountSpan.text( downCount );
						}
					}
				} else {
					if ( self.downButton.hasFlag( 'progressive' ) ) {
						self.downButton.clearFlags();
						downCount = downCount - 1;
						self.$downCountSpan.text( downCount );
					} else {
						self.downButton.setFlags( 'progressive' );
						downCount = downCount + 1;
						self.$downCountSpan.text( downCount );
						if ( self.upButton.hasFlag( 'progressive' ) ) {
							self.upButton.clearFlags();
							upCount = upCount - 1;
							self.$upCountSpan.text( upCount );
						}
					}
				}
				const voteDiff = upCount - downCount;
				self.adjustCommentOrder( voteDiff, upCount, createdTimestamp );
			} else {
				self.reportError( result.error );
			}
			self.block.enableAllButtons();
		} );
	};

	Stream.prototype.createCommentMenu = function ( commentData ) {
		const self = this;

		const items = this.getCommentMenuItems( commentData );

		const menu = new OO.ui.ButtonMenuSelectWidget({
			label: '⋯',
			framed: false,
			invisibleLabel: false,
			classes: [ 'cs-comment-menu' ],
			$overlay: $( document.body ),
			menu: {
				width: 200,
				horizontalPosition: 'end',
				items: this.getCommentMenuItems(commentData)
			}
		});


		if ( commentData.parentid === undefined ) {
			this.streamMenu = menu;
		} else {
			this.replyMenus.push( menu );
		}

		menu.onChoose = function ( item ) {
			const $comment = menu.$element.closest( '.cs-comment' );
			const pageId = commentData.pageid;
			const id = 'cs-comment-' + pageId;

			switch ( item.getData() ) {
				case 'edit':
					self.editComment( $comment, pageId );
					break;
				case 'delete':
					self.deleteComment( $comment, pageId );
					break;
				case 'watch':
					self.watch( item.$element, pageId );
					break;
				case 'collapse':
					if ( self.collapsed ) {
						self.expand();
					} else {
						self.collapse();
					}
					break;
				case 'link':
					$( '.cs-target-comment' ).removeClass( 'cs-target-comment' );
					self.controller.scrollToElement( $comment );
					$comment.addClass( 'cs-target-comment' );
					window.location.hash = '#' + id;
					break;
			}
		};

		menu.menu.on( 'choose', menu.onChoose );

		return menu.$element;
	};

	Stream.prototype.recreateStreamMenu = function ( commentData ) {
		this.streamMenu.menu.clearItems();
		this.streamMenu.menu.addItems( this.getCommentMenuItems( commentData ) );
	};

	Stream.prototype.getCommentMenuItems = function ( commentData ) {
		const items = [];
		if ( this.canEdit( commentData ) ) {
			items.push( this.createEditButton( commentData.username ) );
		}

		if ( this.canDelete( commentData ) ) {
			items.push( this.createDeleteButton( commentData.username ) );
		}

		if ( commentData.parentid === undefined ) {
			if ( this.env.enableWatchlist && this.env.isLoggedIn ) {
				items.push( this.createWatchButton( commentData ) );
			}

			items.push( this.createCollapseButton() );
		}

		items.push( this.createPermalinkButton( commentData.pageid ) );

		return items;
	};

	Stream.prototype.canEdit = function ( commentData ) {
		return ( this.env.isLoggedIn &&
		( this.env.username === commentData.username || this.env.moderatorEdit ) );
	};

	Stream.prototype.canDelete = function ( commentData ) {
		return ( this.env.isLoggedIn &&
		( this.env.username === commentData.username || this.env.moderatorDelete ) &&
		( commentData.numreplies === 0 || commentData.numreplies === undefined || this.env.moderatorFastDelete ) );
	};

	Stream.prototype.createEditButton = function ( username ) {
		const params = {
			data: 'edit'
		};

		if ( this.env.username !== username ) {
			params.label = mw.msg( 'commentstreams-buttontooltip-moderator-edit' );
		} else {
			params.label = mw.msg( 'commentstreams-buttontooltip-edit' );
		}

		return new OO.ui.MenuOptionWidget( params );
	};

	Stream.prototype.createDeleteButton = function ( username ) {
		const params = {
			flags: 'destructive',
			data: 'delete'
		};

		if ( this.env.username !== username ) {
			params.label = mw.msg( 'commentstreams-buttontooltip-moderator-delete' );
		} else {
			params.label = mw.msg( 'commentstreams-buttontooltip-delete' );
		}

		return new OO.ui.MenuOptionWidget( params );
	};

	Stream.prototype.createWatchButton = function ( commentData ) {
		const params = {
			data: 'watch'
		};

		if ( commentData.watching ) {
			params.icon = 'unStar';
			params.flags = 'progressive';
			params.label = mw.msg( 'commentstreams-buttontooltip-unwatch' );
			params.classes = [ 'cs-comment-watching' ];
		} else {
			params.icon = 'star';
			params.label = mw.msg( 'commentstreams-buttontooltip-watch' );
		}

		this.watchButton = new OO.ui.MenuOptionWidget( params );
		return this.watchButton;
	};

	Stream.prototype.createCollapseButton = function () {
		this.collapseButton = new OO.ui.MenuOptionWidget( {
			label: mw.msg( 'commentstreams-buttontooltip-collapse' ),
			classes: [ 'cs-collapse-button' ],
			data: 'collapse'
		} );
		return this.collapseButton;
	};

	Stream.prototype.createPermalinkButton = function () {
		return new OO.ui.MenuOptionWidget( {
			label: mw.msg( 'commentstreams-buttontooltip-permalink' ),
			data: 'link'
		} );
	};

	Stream.prototype.watch = function ( button, pageid ) {
		const self = this;

		const watch = this.watchButton.getIcon() === 'star';
		self.block.disableAllButtons();
		const progressBar = new OO.ui.ProgressBarWidget( {
			progress: false
		} );
		//progressBar.$element.insertBefore( this.$headCommentBody );
		this.$headCommentBody.before(
			$('<div class="cs-progress-wrapper"></div>')
				.append(progressBar.$element)
		)
		this.querier.watch( pageid, watch, function ( result ) {
			progressBar.$element.remove();
			if ( result === undefined ) {
				if ( watch ) {
					self.watchButton.setIcon( 'unStar' );
					self.watchButton.setFlags( 'progressive' );
					self.watchButton.setLabel( mw.msg( 'commentstreams-buttontooltip-unwatch' ) );
					self.watchButton.$element.addClass( 'cs-comment-watching' );
				} else {
					self.watchButton.setIcon( 'star' );
					self.watchButton.setLabel( mw.msg( 'commentstreams-buttontooltip-watch' ) );
					self.watchButton.$element.removeClass( 'cs-comment-watching' );
				}
			} else {
				self.reportError( result.error );
			}
			self.block.enableAllButtons();
		} );
	};

	Stream.prototype.collapse = function () {
		this.$stream.find( '.cs-head-comment .cs-comment-body' ).addClass( 'cs-hidden' );
		this.$stream.find( '.cs-reply-comment' ).addClass( 'cs-hidden' );
		this.$streamFooter.addClass( 'cs-hidden' );
		this.collapseButton.setLabel( mw.msg( 'commentstreams-buttontooltip-expand' ) );
		this.$stream.removeClass( 'cs-expanded' );
		this.$stream.addClass( 'cs-collapsed' );
		this.collapsed = true;
	};

	Stream.prototype.expand = function () {
		this.$stream.find( '.cs-head-comment .cs-comment-body' ).removeClass( 'cs-hidden' );
		this.$stream.find( '.cs-reply-comment' ).removeClass( 'cs-hidden' );
		this.$streamFooter.removeClass( 'cs-hidden' );
		this.collapseButton.setLabel( mw.msg( 'commentstreams-buttontooltip-collapse' ) );
		this.$stream.removeClass( 'cs-collapsed' );
		this.$stream.addClass( 'cs-expanded' );
		this.collapsed = false;
	};

	Stream.prototype.adjustCommentOrder = function (
		voteDiff,
		upCount,
		createdTimestamp
	) {
		const $nextSiblings = this.$stream.nextAll( '.cs-stream' );
		let first = true;
		let index;
		for ( index = 0; index < $nextSiblings.length; index++ ) {
			const $nextSibling = $( $nextSiblings[ index ] );
			const $nextUpCountSpan = $nextSibling.find( '.cs-vote-up-count' );
			const nextUpCount = parseInt( $nextUpCountSpan.text() );
			const $nextDownCountSpan = $nextSibling.find( '.cs-vote-down-count' );
			const nextDownCount = parseInt( $nextDownCountSpan.text() );
			const nextVoteDiff = nextUpCount - nextDownCount;
			if ( nextVoteDiff > voteDiff ) {
			// keeping looking
			} else if ( nextVoteDiff === voteDiff ) {
				if ( nextUpCount > upCount ) {
				// keeping looking
				} else if ( nextUpCount === upCount ) {
					const nextCreatedTimestamp = $nextSibling.attr( 'data-created-timestamp' );
					if ( this.env.newestStreamsOnTop ) {
						if ( nextCreatedTimestamp > createdTimestamp ) {
						// keeping looking
						} else if ( first ) {
						// check previous siblings
							break;
						} else {
							this.moveStream( true, $nextSibling );
							return;
						}
					} else if ( nextCreatedTimestamp < createdTimestamp ) {
					// keep looking
					} else if ( first ) {
					// check previous siblings
						break;
					} else {
						this.moveStream( true, $nextSibling );
						return;
					}
				} else if ( first ) {
				// check previous siblings
					break;
				} else {
					this.moveStream( true, $nextSibling );
					return;
				}
			} else if ( first ) {
			// check previous siblings
				break;
			} else {
				this.moveStream( true, $nextSibling );
				return;
			}
			first = false;
		}
		if ( !first ) {
			this.moveStream( false, $( $nextSiblings[ $nextSiblings.length - 1 ] ) );
			return;
		}
		const $prevSiblings = this.$stream.prevAll( '.cs-stream' );
		first = true;
		for ( index = 0; index < $prevSiblings.length; index++ ) {
			const $prevSibling = $( $prevSiblings[ index ] );
			const $prevUpCountSpan =
			$prevSibling.find( '.cs-vote-up-count' );
			const prevUpCount = parseInt( $prevUpCountSpan.text() );
			const $prevDownCountSpan =
			$prevSibling.find( '.cs-vote-down-count' );
			const prevDownCount = parseInt( $prevDownCountSpan.text() );
			const prevVoteDiff = prevUpCount - prevDownCount;
			if ( prevVoteDiff < voteDiff ) {
			// keeping looking
			} else if ( prevVoteDiff === voteDiff ) {
				if ( prevUpCount < upCount ) {
				// keeping looking
				} else if ( prevUpCount === upCount ) {
					const prevCreatedTimestamp =
					$prevSibling.attr( 'data-created-timestamp' );
					if ( this.env.newestStreamsOnTop ) {
						if ( prevCreatedTimestamp < createdTimestamp ) {
						// keeping looking
						} else if ( first ) {
						// done
							break;
						} else {
							this.moveStream( false, $prevSibling );
							return;
						}
					} else if ( prevCreatedTimestamp > createdTimestamp ) {
					// keeping looking
					} else if ( first ) {
					// done
						break;
					} else {
						this.moveStream( false, $prevSibling );
						return;
					}
				} else if ( first ) {
				// done
					break;
				} else {
					this.moveStream( false, $prevSibling );
					return;
				}
			} else if ( first ) {
			// done
				break;
			} else {
				this.moveStream( false, $prevSibling );
				return;
			}
			first = false;
		}
		if ( !first ) {
			this.moveStream( true, $( $prevSiblings[ $prevSiblings.length - 1 ] )
			);
		}
	// otherwise, the comment was in the correct place already
	};

	Stream.prototype.moveStream = function ( before, $location ) {
		const self = this;
		this.$stream.slideUp( 1000, function () {
			self.$stream.detach();
			self.$stream.hide();
			if ( before ) {
				self.$stream.insertBefore( $location );
			} else {
				self.$stream.insertAfter( $location );
			}
			self.$stream.slideDown( 1000, function () {
				self.block.enableAllButtons();
				self.controller.scrollToElement( self.$stream.find( '.cs-head-comment:first' ) );
			} );
		} );
	};

	Stream.prototype.deleteComment = function ( element, pageId ) {
		const self = this;
		const messageText = mw.msg( 'commentstreams-dialog-delete-message' );
		const yesText = mw.msg( 'commentstreams-dialog-buttontext-yes' );
		const noText = mw.msg( 'commentstreams-dialog-buttontext-no' );
		const dialog = new OO.ui.MessageDialog();
		const windowManager = new OO.ui.WindowManager();
		this.block.$commentDiv.append( windowManager.$element );
		windowManager.addWindows( [ dialog ] );
		windowManager.openWindow( dialog, {
			message: messageText,
			actions: [
				{ label: yesText, action: 'yes' },
				{ label: noText, flags: 'primary' }
			]
		} ).closed.then( function ( data ) {
			if ( data && data.action && data.action === 'yes' ) {
				self.realDeleteComment( element, pageId );
			}
		} );
	};

	Stream.prototype.realDeleteComment = function ( $element, pageId ) {
		const self = this;
		self.block.disableAllButtons();

		let $fadeElement = $element;
		if ( this.pageId === pageId && self.moderatorFastDelete ) {
			$fadeElement = this.$stream;
		}
		$fadeElement.fadeTo( 100, 0.2, function () {
			const progressBar = new OO.ui.ProgressBarWidget( {
				progress: false
			} );
			//progressBar.$element.insertAfter( $element );
			$element.after(
				$('<div class="cs-progress-wrapper"></div>')
					.append(progressBar.$element)
			);
			if ( $element.hasClass( 'cs-head-comment' ) ) {
				self.querier.deleteComment( pageId, function ( result ) {
					progressBar.$element.remove();
					if ( result === undefined ||
						result.error === 'commentstreams-api-error-commentnotfound' ) {
						self.$stream
							.slideUp( 'normal', function () {
								self.$stream.remove();
								self.block.enableAllButtons();
								delete self.block[ self.pageId ];
							} );
					} else {
						self.reportError( result.error );
						$fadeElement.fadeTo( 0.2, 100, function () {
							self.block.enableAllButtons();
						} );
					}
				} );
			} else {
				self.querier.deleteReply( pageId, function ( result ) {
					progressBar.$element.remove();
					if ( result === undefined ||
						result.error === 'commentstreams-api-error-commentnotfound' ) {
						self.querier.queryComment( self.pageId, function ( queryResult ) {
							if ( queryResult.error === undefined ) {
								self.recreateStreamMenu( queryResult );
							}
							$element.slideUp( 'normal', function () {
								$element.remove();
								self.block.enableAllButtons();
							} );
						} );
					} else {
						self.reportError( result.error );
						$fadeElement.fadeTo( 0.2, 100, function () {
							self.block.enableAllButtons();
						} );
					}
				} );
			}
		} );
	};

	Stream.prototype.editComment = function ($element, pageId) {
	const self = this;
	self.block.disableAllButtons();

	const isStream = $element.hasClass('cs-head-comment');

	$element.fadeTo(100, 0.2, function () {
		const progressBar = new OO.ui.ProgressBarWidget({ progress: false });
		//progressBar.$element.insertAfter($element);
		$element.after(
			$('<div class="cs-progress-wrapper"></div>')
				.append(progressBar.$element)
		);
		const queryFn = isStream ? self.querier.queryComment : self.querier.queryReply;
		queryFn.call(self.querier, pageId, function (result) {
			progressBar.$element.remove();
			if (result.error) {
				self.reportError(result.error);
				$element.fadeTo(0.2, 100, function () {
					self.block.enableAllButtons();
				});
				return;
			}

			const $editBox = self.block.createEditBox(isStream);

			// 이벤트 먼저 등록
			self.block.submitButton.connect(self, {
				click: function () {
					console.log('[DEBUG] submit clicked');
					const commentText = self.block.$bodyField.val();
					self.realEditComment($element, pageId, commentText);
				}
			});



			self.block.cancelButton.connect(self, {
				click: function () {
					self.block.$editBox.slideUp('normal', function () {
						$element.fadeTo(0.2, 100, function () {
							self.block.$editBox.remove();
							self.block.enableAllButtons();
						});
					});
				}
			});

			// DOM 삽입은 마지막
			// 이후 DOM 삽입
			$element.hide();
			$editBox.insertAfter($element).hide().slideDown();

			// 내용 세팅
			self.block.$bodyField.val($('<textarea>').html(result.wikitext).text());
			self.block.$bodyField.trigger('focus');

			if ($.fn.applyVisualEditor) {
				self.block.$bodyField.applyVisualEditor();
			}
		});
	});
};


	Stream.prototype.editCommentFromVE = function ( element, pageId ) {
		const self = this;
		const veInstances = this.block.$bodyField.getVEInstances();
		const curVEEditor = veInstances[ veInstances.length - 1 ];
		new mw.Api().post( {
			action: 'veforall-parsoid-utils',
			from: 'html',
			to: 'wikitext',
			content: curVEEditor.target.getSurface().getHtml(),
			title: mw.config.get( 'wgPageName' ).split( /([\\/])/g ).pop()
		} ).then( function ( data ) {
			const commentText = data[ 'veforall-parsoid-utils' ].content;
			self.realEditComment( element, pageId, commentText );
		} )
			.fail( function () {
				self.reportError( 'commentstreams-ve-conversion-error' );
			} );
	};

/**
 * 댓글 수정 (Edit Comment)
 *  - titleField 없음 (commentText만 사용)
 *  - 원댓글/대댓글 모두 통합 처리
 *  - fadeTo / slideUp 등 비동기 안전성 보강
 */
Stream.prototype.realEditComment = function ($element, pageId, commentText) {
	const self = this;

	// 캐시 (비동기 안전용)
	const $editBox = self.block.$editBox;
	const $bodyField = self.block.$bodyField;

	// 유효성 검사
	if (!$bodyField || !$bodyField.length) {
		console.warn('⚠️ $bodyField not found');
		return;
	}
	if (!commentText || commentText.trim() === '') {
		self.reportError('commentstreams-validation-error-nocommenttext');
		return;
	}

	// 버튼 잠금
	self.block.submitButton.setDisabled(true);
	self.block.cancelButton.setDisabled(true);

	// 현재 수정 대상이 원댓글인지 확인
	const isStream = $element.hasClass('cs-head-comment');

	// 시각적 피드백 (회색화 + 로딩바)
	$editBox.fadeTo(100, 0.2, function () {
		const progressBar = new OO.ui.ProgressBarWidget({ progress: false });
		//progressBar.$element.insertAfter($editBox);
		$editBox.after(
			$('<div class="cs-progress-wrapper"></div>')
				.append(progressBar.$element)
		);
		// API 호출
		const apiCall = isStream
			? self.querier.editComment.bind(self.querier, null, commentText, pageId)
			: self.querier.editReply.bind(self.querier, commentText, pageId);

		apiCall(function (result) {
			progressBar.$element.remove();

			// ✅ 정상 수정 완료
			if (!result.error) {
				const $comment = self.createComment(result);
				if (self.collapsed) {
					$comment.find('.cs-comment-body').addClass('cs-hidden');
				}

				$editBox.slideUp('normal', function () {
					$comment.insertAfter($editBox);
					$editBox.remove();
					self.block.$editBox = null;
					$element.remove();
					self.block.enableAllButtons();
					self.controller.scrollToElement($comment);
				});
				return;
			}

			// 🚫 댓글이 사라진 경우 (notfound)
			if (result.error === 'commentstreams-api-error-commentnotfound') {
				console.warn('comment not found, refreshing...');
				$editBox.slideUp('normal', function () {
					$editBox.remove();
					self.block.$editBox = null;
					$element.remove();
					self.block.enableAllButtons();
				});
				return;
			}

			// ❌ 기타 오류 (네트워크, 권한 등)
			self.reportError(result.error);
			$editBox.fadeTo(0.2, 1, function () {
				self.block.submitButton.setDisabled(false);
				self.block.cancelButton.setDisabled(false);
			});
		});
	});
};


	Stream.prototype.reportError = function ( message ) {
	/* eslint-disable mediawiki/msg-doc */
		let messageText = message;
		const mwmessage = mw.message( message );
		if ( mwmessage.exists() ) {
			messageText = mwmessage.text();
		}
		const okText = mw.msg( 'commentstreams-dialog-buttontext-ok' );
		const dialog = new OO.ui.MessageDialog();
		const windowManager = new OO.ui.WindowManager();
		this.block.$commentDiv.append( windowManager.$element );
		windowManager.addWindows( [ dialog ] );
		windowManager.openWindow( dialog, {
			message: messageText,
			actions: [ {
				action: 'accept',
				label: okText,
				flags: 'primary'
			} ]
		} );
	};

	return Stream;
}() );
