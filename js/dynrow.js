/**
 @Name   : dynrow v1.1.0 - 动态添加行插件
 @Author : 戈志刚
 @Date   : 2015-9-22
 @Site   ：http://dynrow.github.io
 @License：Apache License2.0
 */
;
!(function($) {
    //模版引擎
    /**
     * [config 用的是贤心的 laytpl哦]
     * @type {Object}
     */
    var config = {
        open: '{{',
        close: '}}',
        reference: 'd'
    };

    var tool = {
        exp: function(str) {
            return new RegExp(str, 'g');
        },
        //匹配满足规则内容
        query: function(type, _, __) {
            var types = [
                '#([\\s\\S])+?', //js语句
                '([^{#}])*?' //普通字段
            ][type || 0];
            return exp((_ || '') + config.open + types + config.close + (__ || ''));
        },
        escape: function(html) {
            return String(html || '').replace(/&(?!#?[a-zA-Z0-9]+;)/g, '&amp;')
                .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
        },
        error: function(e, tplog) {
            var error = 'Laytpl Error：';
            typeof console === 'object' && console.error(error + e + '\n' + (tplog || ''));
            return error + e;
        }
    };

    var exp = tool.exp,
        Tpl = function(tpl) {
            this.tpl = tpl;
        };

    Tpl.pt = Tpl.prototype;

    //核心引擎
    Tpl.pt.parse = function(tpl, data) {
        var that = this,
            tplog = tpl;
        var jss = exp('^' + config.open + '#', ''),
            jsse = exp(config.close + '$', '');

        tpl = tpl.replace(/[\r\t\n]/g, ' ').replace(exp(config.open + '#'), config.open + '# ')
            .replace(exp(config.close + '}'), '} ' + config.close).replace(/\\/g, '\\\\')
            .replace(/(?="|')/g, '\\').replace(tool.query(), function(str) {
                str = str.replace(jss, '').replace(jsse, '');
                return '";' + str.replace(/\\/g, '') + '; view+="';
            }).replace(tool.query(1), function(str) {
                var start = '"+(';
                if (str.replace(/\s/g, '') === config.open + config.close) {
                    return '';
                }
                str = str.replace(exp(config.open + '|' + config.close), '');
                if (/^=/.test(str)) {
                    str = str.replace(/^=/, '');
                    start = '"+_escape_(';
                }
                return start + str.replace(/\\/g, '') + ')+"';
            });

        tpl = '"use strict";var view = "' + tpl + '";return view;';

        try {
            that.cache = tpl = new Function('' + config.reference + ', _escape_', tpl);
            return tpl(data, tool.escape);
        } catch (e) {
            delete that.cache;
            return tool.error(e, tplog);
        }
    };

    Tpl.pt.render = function(data, callback) {
        var that = this,
            tpl;
        if (!data) return tool.error('no data');
        tpl = that.cache ? that.cache(data, tool.escape) : that.parse(that.tpl, data);
        if (!callback) return tpl;
        callback(tpl);
    };

    var laytpl = function(tpl) {
        if (typeof tpl !== 'string') return tool.error('Template not found');
        return new Tpl(tpl);
    };

    laytpl.config = function(options) {
        options = options || {};
        for (var i in options) {
            config[i] = options[i];
        }
    };
    /**
     * [Dynrow 动态添加行主体]
     * @这里是哥自己写的哦
     * @param {[String]} tableId     [table的id]
     * @param {[object]} options     [参数]
     */
    var DynamicRow = function(ele, options) {
        this.$element = $("#" + ele);
        this.option = $.extend({}, this.DEFAULT, options);
        if (options.reference) {
            laytpl.config({
                reference: options.reference
            });
        }
        if (this.$element.length) {
            this.init();
        } else {
            throw Error("初始化时table id 未获取到...");
        }
    };
    //版本号
    DynamicRow.version = '1.1.0';

    DynamicRow.prototype = {
        init: function() {
            this.keyClass = this.guid();
            this._addEvent();
            this._addDefaultLine();
        },
        DEFAULT: {
            tmplId: "",
            addNextId: null,
            position: false,
            selector: "[data-table='dynrow']",
            params: null,
            deflutOne: true,
            deleteLast: true,
            fnAdd: null,
            fnDel: null,
            fnDelBefore: null,
            checkRow: "[data-table='rowspan']"
        },
        /**
         * 添加一行
         * @param obj           新添加行位置
         * @param y             模版标识
         * @param template      模版
         */
        _addLine: function(obj, temp) {
            var opt = this.option,
                template = $(temp),
                addType = opt.position ? 'before' : 'after';
            //为当前模版添唯一标识，添加行时判断最后一行用
            template.addClass(this.keyClass);
            //如果没有找到tr 则向tbody插入
            if (this.isEmpty) {
                addType = 'append';
            }
            $(obj)[addType](template);
            //检查是否含有跨列
            this._addRowspan();
            //检查回调函数
            if ($.type(opt.fnAdd) === "function") {
                opt.fnAdd.call(this, template);
            }
        },
        /**
         * 在需要绑定事件的元素中添加 data-table='row' 自定义属性
         * 向下添加一行，内容重置，默认只清空 (文本框，单选框，复选框，文本域)
         */
        _addEvent: function() {
            var that = this,
                opt = that.option;
            //添加行事件
            that.$element.on("click", opt.selector, function(e) {
                if ($(this).hasClass("delete")) return false;
                that._getLaytpl(opt.tmplId, opt.params, function(html) {
                    that._addLine(that._getAddDom(), html);
                });
                return false;
            });
            //删除行事件
            that.$element.on("click", ".delete", function(e) {
                that._deleteRow($(this).closest('tr'));
                return false;
            });
        },
        _addDefaultLine: function() {
            var that = this;
            if (that.option.deflutOne) {
                that.addRow();
            }
        },
        /**
         * [_getAddDom 获取dom]
         * @return {[type]} [description]
         */
        _getAddDom: function() {
            var dom = this.$element.find("#" + this.option.addNextId);
            this.isEmpty = false;
            if (dom.length === 0) {
                dom = this.$element.find("." + this.keyClass);
            }
            if (dom.length === 0) {
                this.isEmpty = true;
                dom = this.$element;
            }
            return dom.length > 1 ? dom[dom.length - 1] : dom;
        },
        /**
         * [_getLaytpl 获取模版]
         * @param  {[type]}   tmpl     [模版内容]
         * @param  {[type]}   data     [模版数据]
         * @param  {Function} callback [回调函数]
         */
        _getLaytpl: function(tmpl, data, callback) {
            var tpl = document.getElementById(tmpl).innerHTML; //读取模版
            //方式一：异步渲染（推荐）
            laytpl(tpl).render(data ? data : {}, function(html) {
                callback.call(undefined, html);
            });
        },
        _deleteRow: function($tr) {
            var that = this,
                opt = that.option,
                len = that.$element.find("." + that.keyClass).length;
         
            if ($.type(opt.fnDelBefore) === 'function') {
                if (opt.fnDelBefore.call({}, $tr) == false) {
                    return false;
                }
            }
            if (!opt.deleteLast && len === 1) {
                return false;
            }
            
            $tr.remove();
            that._minusRowspan();
            if ($.type(opt.fnDel) === "function") {
                opt.fnDel.call({}, len - 1);
            }
        },
        /**
         * [_addRowspan 检查是否含有跨列]
         * @param {[type]} obj [description]
         */
        _addRowspan: function(obj) {
            var objs = this.$element.find(this.option.checkRow);
            if (objs.length) {
                var obj = objs[objs.length - 1];
                obj.setAttribute("rowspan", (parseInt(obj.getAttribute("rowspan"), 10) + 1));
            }
        },
        _minusRowspan: function(obj) {
            var objs = this.$element.find(this.option.checkRow);
            if (objs.length) {
                var obj = objs[objs.length - 1];
                obj.setAttribute("rowspan", (parseInt(obj.getAttribute("rowspan"), 10) - 1));
            }
        },
        /**
         * [addRow 添加一行]
         */
        addRow: function(num) {
            var that = this;
            num = $.type(num) === 'number' ? num : 1;
            for (var i = 0; i < num; i++) {
                that._getLaytpl(that.option.tmplId, that.option.params, function(html) {
                    that._addLine(that._getAddDom(), html);
                });
            }
        },
        /**
         * [deleteLastRow 删除一行]
         * 从最后一行开始
         * @return {[type]} [description]
         */
        deleteRow: function(index) {
            var that = this,
                trs = that.$element.find("." + that.keyClass);
            if (trs.length) {
                var trDom = trs[typeof index === 'number' ? index : (trs.length - 1)];
                if (trDom) that._deleteRow($(trDom));
            }
        },
        /**
         * [deleteAll 清空所有行]
         * @return {[type]} [description]
         */
        deleteAll: function() {
            var that = this;
            var trs = that.$element.find("." + that.keyClass);
            if (trs.length) {
                for (var j = 0; j < trs.length; j++) {
                    $(trs[j]).remove();
                    that._minusRowspan();
                }
            }
        },
        /**
         * [getRow 获取已添加上的行对象 默认返回最后添加一行  没有返回null]
         * @parms  [index]  指点获取的行 如不填写index值则返回最后一行，如没有值则返回undefined
         * @return {[type]} [description]
         */
        getRow: function(index) {
            var result = null,
                trs = this.$element.find("." + this.keyClass);
            if (trs.length) {
                try {
                    result = trs[typeof index === 'number' ? index : (trs.length - 1)];
                } catch (e) {}
            }
            return result;
        },
        /**
         * 生成动态不重复的一个16位的唯一标识
         * @returns {string}
         */
        guid: function() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0,
                    v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            }).toUpperCase();
        }
    };

    DynamicRow.v = "1.1";

    var Dynrow = DynamicRow;

    "function" == typeof define ? define(function() {
        return Dynrow;
    }) : "undefined" != typeof exports ? module.exports = Dynrow : window.Dynrow = Dynrow;
})(jQuery);
