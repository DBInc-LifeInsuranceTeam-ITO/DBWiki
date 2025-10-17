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

	function Block( controller, env, querier, blockName, $commentDiv ) {
		this.controller = controller;
		this.env = env;
		this.querier = querier;
		this.blockName = blockName;

		this.$commentDiv = null;
		this.addButton = null;
		this.$headerDiv = null;
		this.$footerDiv = null;
		this.$editBox = null;
		this.$titleField = null;
		this.$bodyField = null;
		this.submitButton = null;
		this.cancelButton = null;

		this.streams = [];
		this.createBlock( $commentDiv );
	}

	Block.prototype.createBlock = function ( $commentDiv ) {
		const self = this;

		this.$commentDiv = $commentDiv;

		this.$headerDiv = $( '<div>' ).addClass( 'cs-header' );
		this.$commentDiv.append( this.$headerDiv );

		this.$footerDiv = $( '<div>' ).addClass( 'cs-footer' );
		this.$commentDiv.append( this.$footerDiv );

		const params = {

		};

		const buttonText = mw.msg( 'commentstreams-buttontext-add' );
		if ( this.env.showLabels ) {
			params.label = buttonText;
		} else {
			params.title = buttonText;
			params.framed = false;
		}
		if ( !this.env.canComment ) {
			params.disabled = true;
		}

		this.addButton = new OO.ui.ButtonWidget( params );

		if ( this.env.newestStreamsOnTop ) {
			this.$headerDiv.append( this.addButton.$element );
		} else {
			this.$footerDiv.append( this.addButton.$element );
		}

		this.addButton.onClick = function () {
			self.showNewCommentStreamBox();
		};

		this.addButton.on( 'click', this.addButton.onClick );
	};

	Block.prototype.addStream = function ( commentData ) {
		const Stream = require( './Stream.js' );
		const stream = new Stream( this.controller, this.env, this, this.querier, commentData );
		if ( this.env.newestStreamsOnTop ) {
			stream.getStream().insertAfter( this.$headerDiv );
		} else {
			stream.getStream().insertBefore( this.$footerDiv );
		}

		if ( this.env.initiallyCollapsed ) {
			stream.collapse();
		}

		this.streams[ commentData.pageid ] = stream;

		if ( commentData.children !== undefined ) {
			for ( const childComment of commentData.children ) {
				stream.addReply( childComment );
			}
		}

		return stream;
	};

	Block.prototype.enableAllButtons = function () {
		this.addButton.setDisabled( false );
		this.streams.forEach( function ( stream ) {
			stream.enableButtons();
		} );
	};

	Block.prototype.disableAllButtons = function () {
		this.addButton.setDisabled( true );
		this.streams.forEach( function ( stream ) {
			stream.disableButtons();
		} );
	};
Block.prototype.createEditBox = function (isStream) {
	// 기존 편집 박스 제거 (중복 방지)
	if (this.$editBox) {
		this.$editBox.remove();
		this.$editBox = null;
	}

	// 새 편집 박스 생성
	this.$editBox = $('<div>').addClass('cs-edit-box');

	// 본문 입력 영역
	this.$bodyField = $('<textarea>')
		.attr({
			rows: 2,
			placeholder: mw.msg('commentstreams-body-field-placeholder')
		})
		.addClass('cs-body-edit-field');

	this.$editBox.append(this.$bodyField);

	// 버튼 컨테이너
	const $buttonContainer = $('<div>').addClass('cs-edit-actions');

	// 기존 버튼 객체 제거 (핸들러 충돌 방지)
	if (this.submitButton) this.submitButton.$element.remove();
	if (this.cancelButton) this.cancelButton.$element.remove();

	// 새 OOUI 버튼 생성
	this.submitButton = new OO.ui.ButtonWidget({
		label: '등록',
		title: '등록',
		flags: ['progressive'],
		framed: true
	});

	this.cancelButton = new OO.ui.ButtonWidget({
		label: '취소',
		title: '취소',
		flags: ['destructive'],
		framed: true
	});

	// 버튼 DOM 추가
	$buttonContainer.append(this.submitButton.$element);
	$buttonContainer.append(this.cancelButton.$element);
	this.$editBox.append($buttonContainer);

	return this.$editBox; // ✅ 반환해주는 게 중요 (editComment에서 체인 연결 가능)
};

	Block.prototype.showNewCommentStreamBox = function () {
		const self = this;

		this.createEditBox( true );
		if ( this.env.newestStreamsOnTop ) {
			this.$headerDiv.append( this.$editBox );
		} else {
			this.$footerDiv.prepend( this.$editBox );
		}

		this.$editBox
			.hide()
			.slideDown();

		if ( $.fn.applyVisualEditor ) {
			// VEForAll is installed.
			this.$bodyField.applyVisualEditor();
		}

		this.submitButton.onClick = function () {
			self.postComment( null );
		};
		this.submitButton.on( 'click', this.submitButton.onClick );

		this.cancelButton.onClick = function () {
			self.hideEditBox( true );
		};
		this.cancelButton.on( 'click', this.cancelButton.onClick );

		this.disableAllButtons();

		if ( this.$titleField !== null ) {
			this.$titleField.trigger( 'focus' );
		} else {
			this.$bodyField.trigger( 'focus' );
		}
	};

	Block.prototype.hideEditBox = function ( animated ) {
		const self = this;
		if ( animated ) {
			this.$editBox.slideUp( 'normal', function () {
				self.$editBox.remove();
				self.$editBox = null;
			} );
		} else {
			this.$editBox.remove();
			this.$editBox = null;
		}
		this.enableAllButtons();
	};

	Block.prototype.postComment = function ( parentPageId ) {
		const self = this;
		if ( this.env.isLoggedIn ) {
			self.postComment2( parentPageId );
		} else {
			const messageText = mw.msg( 'commentstreams-dialog-anonymous-message' );
			const okText = mw.msg( 'commentstreams-dialog-buttontext-ok' );
			const cancelText = mw.msg( 'commentstreams-dialog-buttontext-cancel' );
			const dialog = new OO.ui.MessageDialog();
			const windowManager = new OO.ui.WindowManager();
			this.$commentDiv.append( windowManager.$element );
			windowManager.addWindows( [ dialog ] );
			windowManager.openWindow( dialog, {
				message: messageText,
				actions: [
					{ label: okText, action: 'ok' },
					{ label: cancelText, flags: 'primary' }
				]
			} ).closed.then( function ( data ) {
				if ( data && data.action && data.action === 'ok' ) {
					self.postComment2( parentPageId );
				}
			} );
		}
	};

	Block.prototype.postComment2 = function ( parentPageId ) {
		const self = this;
		if ( this.$bodyField.css( 'display' ) === 'none' ) {
			self.postCommentFromVE( parentPageId );
		} else {
			const commentText = this.$bodyField.val();
			self.realPostComment( parentPageId, commentText );
		}
	};

	Block.prototype.postCommentFromVE = function ( parentPageId ) {
		const self = this;
		const veInstances = this.$bodyField.getVEInstances();
		const curVEEditor = veInstances[ veInstances.length - 1 ];
		new mw.Api().post( {
			action: 'veforall-parsoid-utils',
			from: 'html',
			to: 'wikitext',
			content: curVEEditor.target.getSurface().getHtml(),
			title: mw.config.get( 'wgPageName' ).split( /([\\/])/g ).pop()
		} ).then( function ( data ) {
			const commentText = data[ 'veforall-parsoid-utils' ].content;
			self.realPostComment( parentPageId, commentText );
		} )
			.fail( function () {
				self.reportError( 'commentstreams-ve-conversion-error' );
			} );
	};

	Block.prototype.realPostComment = function (
		parentPageId,
		commentText
	) {
		const self = this;

		// 제목 필드 아예 제거 → 항상 null
    let commentTitle = null;

    // 본문이 비었는지만 체크
    if ( parentPageId === null ) {
    if ( this.$titleField !== null ) {
        commentTitle = this.$titleField.val().trim();
    }
    if ( !commentTitle ) {
        commentTitle = " "; // 또는 "No Title"
    }
} else {
    commentTitle = null;
}

    this.submitButton.setDisabled( true );
    this.cancelButton.setDisabled( true );

    this.$editBox.fadeTo( 100, 0.2, function () {
        const progressBar = new OO.ui.ProgressBarWidget( {
            progress: false
        } );
        progressBar.$element.insertAfter( self.$editBox );

        if ( parentPageId ) {
            // 대댓글(Reply)
            self.querier.postReply(
                commentText,
                parentPageId,
                function ( result ) {
                    progressBar.$element.remove();
                    if ( result.error === undefined ) {
                        self.hideEditBox( false );
                        self.streams[ parentPageId ].addReply( result );
                        self.querier.queryComment( parentPageId, function ( queryResult ) {
                            if ( queryResult.error === undefined ) {
                                self.streams[ parentPageId ].recreateStreamMenu( queryResult );
                            }
                        } );
                    } else {
                        self.reportError( result.error );
                        self.$editBox.fadeTo( 0.2, 100, function () {
                            self.submitButton.setDisabled( false );
                            self.cancelButton.setDisabled( false );
                        } );
                    }
                }
            );
        } else {
            // 일반 댓글(Comment)
            self.querier.postComment(
                commentTitle, // null 고정
                commentText,
                self.env.associatedPageId,
                self.blockName,
                function ( result ) {
                    progressBar.$element.remove();
                    if ( result.error === undefined ) {
                        self.hideEditBox( false );
                        const stream = self.addStream( result );
                        stream.adjustCommentOrder( 0, 0, result.created_timestamp );
                    } else {
                        self.reportError( result.error );
                        self.$editBox.fadeTo( 0.2, 100, function () {
                            self.submitButton.setDisabled( false );
                            self.cancelButton.setDisabled( false );
                        } );
                    }
                }
            );
        }
    } );
	};

	Block.prototype.reportError = function ( message ) {
		/* eslint-disable mediawiki/msg-doc */
		let messageText = message;
		const mwmessage = mw.message( message );
		if ( mwmessage.exists() ) {
			messageText = mwmessage.text();
		}
		const okText = mw.msg( 'commentstreams-dialog-buttontext-ok' );
		const dialog = new OO.ui.MessageDialog();
		const windowManager = new OO.ui.WindowManager();
		this.$commentDiv.append( windowManager.$element );
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

	return Block;
}() );
