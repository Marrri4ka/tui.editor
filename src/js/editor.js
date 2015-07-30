/**
 * @fileoverview
 * @author Sungho Kim(sungho-kim@nhnent.com) FE Development Team/NHN Ent.
 */

'use strict';

var MarkdownEditor = require('./markdownEditor'),
    Preview = require('./preview'),
    WysiwygEditor = require('./wysiwygEditor'),
    Layout = require('./layout'),
    EventManager = require('./eventManager'),
    CommandManager = require('./commandManager'),
    extManager = require('./extManager'),
    Converter = require('./converter');

//markdown commands
var mdcBold = require('./markdownCommands/bold'),
    mdcItalic = require('./markdownCommands/italic'),
    mdcBlockquote = require('./markdownCommands/blockquote'),
    mdcHeading = require('./markdownCommands/heading'),
    mdcHR = require('./markdownCommands/hr'),
    mdcAddLink = require('./markdownCommands/addLink'),
    mdcAddImage = require('./markdownCommands/addImage'),
    mdcUL = require('./markdownCommands/ul'),
    mdcOL = require('./markdownCommands/ol'),
    mdcTask = require('./markdownCommands/task');

//wysiwyg Commands
var wwBold = require('./wysiwygCommands/bold'),
    wwItalic = require('./wysiwygCommands/italic'),
    wwBlockquote = require('./wysiwygCommands/blockquote'),
    wwAddImage = require('./wysiwygCommands/addImage'),
    wwAddLink = require('./wysiwygCommands/addLink'),
    wwHR = require('./wysiwygCommands/hr'),
    wwHeading = require('./wysiwygCommands/heading'),
    wwUL = require('./wysiwygCommands/ul'),
    wwOL = require('./wysiwygCommands/ol'),
    wwTask = require('./wysiwygCommands/task');

var util = ne.util;

var __nedInstance = [];

//default extensions
require('./extensions/querySplitter');
require('./extensions/textPalette');

/**
 * NeonEditor
 * @exports NeonEditor
 * @constructor
 * @class
 * @param {object} options 옵션
 * @param {number} options.height 에디터 height 픽셀
 * @param {string} options.initialValue 초기 입력 테스트
 * @param {string} options.previewStyle 프리뷰가 출력되는 방식을 정한다(tab, vertical)
 * @param {string} options.initialEditType 시작시 표시될 에디터 타입(markdown, wysiwyg)
 * @param {string} options.contentCSSStyles List of CSS style file path for HTML content.
 * @param {function} options.onload invoke function when editor loaded complete
 * @param {object} options.hooks 외부 연결 훅 목록
 * @param {function} options.hooks.htmlRenderAfterHook DOM으로 그려질 HTML텍스트가 만들어진후 실행되는 훅, 만들어진 HTML텍스트가 인자로 전달되고 리턴값이 HTML텍스트로 대체된다.
 * @param {function} options.hooks.previewBeforeHook 프리뷰 되기 직전 실행되는 훅, 프리뷰에 그려질 DOM객체들이 인자로 전달된다.
 * @param {function} options.hooks.addImageFileHook 이미지 추가 팝업에서 이미지가 선택되면 hook에 이미지정보가 전달되고 hook에서 이미지를 붙인다.
 */
function NeonEditor(options) {
    var self = this;

    this.options = $.extend({
        'previewStyle': 'tab',
        'initialEditType': 'markdown',
        'height': 300
    }, options);

    this.eventManager = new EventManager();

    this._initEvent();

    this.commandManager = new CommandManager(this);
    this.converter = new Converter();
    this.layout = new Layout(options, this.eventManager);
    this.layout.init();

    this.mdEditor = new MarkdownEditor(this.layout.getMdEditorContainerEl(), this.eventManager);
    this.preview = new Preview(this.layout.getPreviewEl(), this.eventManager);
    this.wwEditor = new WysiwygEditor(this.layout.getWwEditorContainerEl(), this.options.contentCSSStyles, this.eventManager);

    if (this.options.hooks) {
        util.forEach(this.options.hooks, function(fn, key) {
            self.eventManager.listen(key, fn);
        });
    }

    this.changePreviewStyle(this.options.previewStyle);

    this.mdEditor.init();

    this.wwEditor.init(this.options.height, function() {
        extManager.applyExtension(self, self.options.exts);

        self._initDefaultCommands();

        if (self.options.initialEditType === 'markdown') {
            self.eventManager.emit('changeMode.markdown');
        } else {
            self.eventManager.emit('changeMode.wysiwyg');
        }

        self.eventManager.emit('changeMode', self.options.initialEditType);

        self.setValue(self.options.initialValue);

        if (self.options.onload) {
            self.options.onload(self);
        }
    });

    window.dd = this;

    __nedInstance.push(this);
}

NeonEditor.prototype._initEvent = function() {
    var self = this;

    this.eventManager.listen('changeMode.wysiwyg', function() {
        self.currentMode = 'wysiwyg';
        self.wwEditor.setValue(self.converter.toHTML(self.mdEditor.getValue()));
    });

    this.eventManager.listen('changeMode.markdown', function() {
        self.currentMode = 'markdown';
        self.mdEditor.setValue(self.converter.toMarkdown(self.wwEditor.getValue()));
    });

    this.eventManager.listen('contentChanged.markdownEditor', function(markdown) {
        self.preview.render(self.converter.toHTML(markdown));
    });
};

NeonEditor.prototype._initDefaultCommands = function() {
    this.commandManager.addCommand(mdcBold);
    this.commandManager.addCommand(mdcItalic);
    this.commandManager.addCommand(mdcBlockquote);
    this.commandManager.addCommand(mdcHeading);
    this.commandManager.addCommand(mdcHR);
    this.commandManager.addCommand(mdcAddLink);
    this.commandManager.addCommand(mdcAddImage);
    this.commandManager.addCommand(mdcUL);
    this.commandManager.addCommand(mdcOL);
    this.commandManager.addCommand(mdcTask);

    this.commandManager.addCommand(wwBold);
    this.commandManager.addCommand(wwItalic);
    this.commandManager.addCommand(wwBlockquote);
    this.commandManager.addCommand(wwUL);
    this.commandManager.addCommand(wwOL);
    this.commandManager.addCommand(wwAddImage);
    this.commandManager.addCommand(wwAddLink);
    this.commandManager.addCommand(wwHR);
    this.commandManager.addCommand(wwHeading);
    this.commandManager.addCommand(wwTask);
};

/**
 * 프리뷰가 보여지는 방식을 변경한다
 * @param {string} style 스타일 이름 tab, vertical
 */
NeonEditor.prototype.changePreviewStyle = function(style) {
    this.layout.changePreviewStyle(style);
    this.mdPreviewStyle = style;
};

NeonEditor.prototype.exec = function() {
    this.commandManager.exec.apply(this.commandManager, arguments);
};

NeonEditor.prototype.getCodeMirror = function() {
    return this.mdEditor.getEditor();
};

NeonEditor.prototype.getSquire = function() {
    return this.wwEditor.getEditor();
};

NeonEditor.prototype.focus = function() {
   this.getCurrentModeEditor().focus();
};

NeonEditor.prototype.setValue = function(markdown) {
    markdown = markdown || '';

    if (this.isMarkdownMode()) {
        this.mdEditor.setValue(markdown);
    } else {
        this.wwEditor.setValue(this.converter.toHTML(markdown));
    }
};

NeonEditor.prototype.getValue = function() {
    var markdown;

    if (this.isMarkdownMode()) {
        markdown = this.mdEditor.getValue();
    } else {
        markdown = this.converter.toMarkdown(this.wwEditor.getValue());
    }

    return markdown;
};

NeonEditor.prototype.addWidget = function(selection, node, style, offset) {
    this.getCurrentModeEditor().addWidget(selection, node, style, offset);
};

NeonEditor.prototype.getCurrentModeEditor = function() {
    var editor;

    if (this.isMarkdownMode()) {
        editor = this.mdEditor;
    } else {
        editor = this.wwEditor;
    }

    return editor;
};

NeonEditor.prototype.isMarkdownMode = function() {
    return this.currentMode === 'markdown';
};

NeonEditor.prototype.isWysiwygMode = function() {
    return this.currentMode === 'wysiwyg';
};

NeonEditor.prototype.remove = function() {
    this.wwEditor.remove();
    this.mdEditor.remove();
    this.layout.remove();
};

NeonEditor.prototype.hide = function() {
    this.layout.hide();
};

NeonEditor.prototype.show = function() {
    this.layout.show();
};

NeonEditor.getInstances = function() {
    return __nedInstance;
};

NeonEditor.defineExtension = function(name, ext) {
    extManager.defineExtension(name, ext);
};

module.exports = NeonEditor;