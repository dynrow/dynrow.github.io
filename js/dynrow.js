/**
 @Name   : dynrow v1.0 - 动态添加行插件
 @Author : 戈志刚
 @Date   : 2015-9-22
 @Site   ：http://dynrow.github.io
 @License：Apache License2.0
 */
;!(function($) {
    //模版引擎
    /**
     * [config 用的是闲心的 laytpl哦]
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
        //console.log(tpl);
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
    //填充表单方法
    /**
     * [Fill 用的是jquery.fill.js]
     */
    function Fill() {
        this.defaults = {
            styleElementName: 'none', // object | none
            dateFormat: 'mm/dd/yy',
            debug: false,
            elementsExecuteEvents: ['checkbox', 'radio', 'select-one']
        };
    };
    $.extend(Fill.prototype, {
        setDefaults: function(settings) {
            this.defaults = $.extend({}, this.defaults, settings);
            return this;
        },

        fill: function(obj, _element, settings) {
            if (settings == null) {
                settings = {};
            }
            var options = $.extend({}, this.defaults, settings);
            _element.find("*").each(function(i, item) {
                if ($(item).is("input") || $(item).is("select") || $(item).is("textarea")) {
                    try {
                        var objName;
                        var arrayAtribute;
                        try {

                            if (options.styleElementName == "object") {
                                // Verificando se � um array
                                if ($(item).attr("name").match(/\[[0-9]*\]/i)) {
                                    objName = $(item).attr("name").replace(/^[a-z]*[0-9]*[a-z]*\./i, 'obj.').replace(/\[[0-9]*\].*/i, "");

                                    arrayAtribute = $(item).attr("name").match(/\[[0-9]*\]\.[a-z0-9]*/i) + "";
                                    arrayAtribute = arrayAtribute.replace(/\[[0-9]*\]\./i, "");
                                } else {
                                    objName = $(item).attr("name").replace(/^[a-z]*[0-9]*[a-z]*\./i, 'obj.');
                                }
                            } else if (options.styleElementName == "none") {
                                objName = 'obj.' + $(item).attr("name");
                            }
                            var value = eval(objName);
                        } catch (e) {
                            if (options.debug) {
                                debug(e.message);
                            }
                        }
                        if (value != null) {
                            switch (item.type) {
                                case "hidden":
                                case "password":
                                case "textarea":
                                    $(item).val(value);
                                    break;

                                case "text":
                                    if ($(item).hasClass("hasDatepicker")) {
                                        var re = /^[-+]*[0-9]*$/;
                                        var dateValue = null;
                                        if (re.test(value)) {
                                            dateValue = new Date(parseInt(value));
                                            var strDate = dateValue.getUTCFullYear() + '-' + (dateValue.getUTCMonth() + 1) + '-' + dateValue.getUTCDate();
                                            dateValue = $.datepicker.parseDate('yy-mm-dd', strDate);
                                        } else if (value) {
                                            dateValue = $.datepicker.parseDate(options.dateFormat, value);
                                        }
                                        $(item).datepicker('setDate', dateValue);
                                    } else if ($(item).attr("alt") == "double") {
                                        $(item).val(value.toFixed(2));
                                    } else {
                                        $(item).val(value);
                                    }
                                    break;

                                case "select-one":
                                    if (value) {
                                        $(item).val(value);
                                    }
                                    break;
                                case "radio":
                                    $(item).each(function(i, radio) {
                                        if ($(radio).val() == value) {
                                            $(radio).prop("checked", "checked");
                                        }
                                    });
                                    break;
                                case "checkbox":
                                    if ($.isArray(value)) {
                                        $.each(value, function(i, arrayItem) {
                                            if (typeof(arrayItem) == 'object') {
                                                arrayItemValue = eval("arrayItem." + arrayAtribute);
                                            } else {
                                                arrayItemValue = arrayItem;
                                            }
                                            if ($(item).val() == arrayItemValue) {
                                                $(item).attr("checked", "checked");
                                            }
                                        });
                                    } else {
                                        var values = value.split(",");
                                        for (var i = 0; i < values.length; i++) {
                                            if (values[i] == $(item).val()) {
                                                $(item).attr("checked", "checked");
                                                break;
                                            }
                                        }
                                    }
                                    break;
                            }
                            executeEvents(item);
                        }
                    } catch (e) {
                        if (options.debug) {
                            debug(e.message);
                        }
                    }

                }

            });
        }
    });
    $.fn.fill = function(obj, settings) {
        $.fill.fill(obj, $(this), settings);
        return this;
    };

    $.fill = new Fill();

    function executeEvents(element) {
        if (jQuery.inArray($(element).attr('type'), $.fill.defaults.elementsExecuteEvents)) {
            if ($(element).attr('onchange')) {
                $(element).change();
            }

            if ($(element).attr('onclick')) {
                $(element).click();
            }
        }
    };

    function debug(message) { // Throws error messages in the browser console.
        if (window.console && window.console.log) {
            window.console.log(message);
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

    DynamicRow.prototype = {
        init: function() {
            this.keyClass = this.guid();
            this.isRow = !0;
            this.addClickLine();
            this.deleteLine();
            this.echoListLine();
        },
        DEFAULT: {
            tmplId      : "",
            addNextId   : null,
            position    : false,
            selector    : "[data-table='dynrow']",
            params      : null,
            deflutOne   : true,
            addLineNum  : 0,
            deleteLast  : true,
            callback    : null,
            deleteback  : null,
            echoData    : null,
            echoForm    : null,
            checkRow    : "[data-table='rowspan']"
        },
        /**
         * 添加一行
         * @param obj           新添加行位置
         * @param y             模版标识
         * @param template      模版
         */
        addLine: function(obj, temp) {
            var opt = this.option,
                template = $(temp);
            //为当前模版添唯一标识，添加行时判断最后一行用
            template.addClass(this.keyClass);
            $(obj)[opt.position?'before':'after'](template);
            this.option.addLineNum++;
            //检查是否含有跨列
            this.addRowspan();
            //检查回调函数
            if (typeof this.option.callback === "function") {
                this.option.callback.call(this, template);
            }
        },
        /**
         * 在需要绑定事件的元素中添加 data-table='row' 自定义属性
         * 向下添加一行，内容重置，默认只清空 (文本框，单选框，复选框，文本域)
         */
        addClickLine: function() {
            var that = this;
            that.$element.on("click", that.option.selector, function(e) {
                if ($(this).hasClass("delete")) return false;
                that.getLaytpl(that.option.tmplId, that.option.params, function(html) {
                    that.addLine(that.getAddDom(), html);
                });
                return false;
            });
        },
        /**
         * 回显数据调用
         */
        echoListLine: function() {
            var that = this,
                obj = that.option.echoData;
            obj ? that.insertData(obj) : that.addDefaultLine();
        },
        /**
         * @param data          回显数据
         */
        insertData: function(obj) {
            var that = this,
                value = "";
            for (i in obj) value = i;
            for (var i = 0; i < obj[value].length; i++) {
                that.addOneLine();
            }
            if (that.option.echoForm) {
                $("#"+that.option.echoForm).fill(obj);
            } else {
                throw Error('回显数据或formid填写错误！！');
            }
        },
        /**
         * [replacement 清空所有行]
         * @return {[type]} [description]
         */
        replacement: function() {
            var that = this;
            var trs = that.$element.find("." + that.keyClass);
            if (trs.length) {
                for (var j = 0; j < trs.length; j++) {
                    $(trs[j]).remove();
                    that.minusRowspan();
                }
            }
        },
        addDefaultLine : function(){
            var that = this;
            if (that.option.deflutOne) {
                that.getLaytpl(that.option.tmplId, that.option.params, function(html) {
                    that.addLine(that.getAddDom(), html);
                });
            }
        },
        /**
         * [addOneLine 添加一行]
         */
        addOneLine: function() {
            var that = this;
            that.getLaytpl(that.option.tmplId, that.option.params, function(html) {
                that.addLine(that.getAddDom(), html);
            });
        },
        /**
         * [getAddDom 获取dom]
         * @return {[type]} [description]
         */
        getAddDom: function() {
            var that = this,
                dom = that.$element.find("#" + that.option.addNextId);
            if (dom.length === 0) {
                dom = that.$element.find("." + that.keyClass);
            }
            if (dom.length === 0) {
                dom = that.$element.find("tr");
            }
            return dom.length > 1 ? dom[dom.length - 1] : dom;
        },
        /**
         * [getLaytpl 获取模版]
         * @param  {[type]}   tmpl     [模版内容]
         * @param  {[type]}   data     [模版数据]
         * @param  {Function} callback [回调函数]
         */
        getLaytpl: function(tmpl, data, callback) {
            var tpl = document.getElementById(tmpl).innerHTML; //读取模版
            //方式一：异步渲染（推荐）
            laytpl(tpl).render(data ? data : {}, function(html) {
                callback.call(undefined, html);
            });
        },
        //删除当前行，第一行不执行事件
        deleteLine: function() {
            var that = this;
            that.$element.on("click", ".delete", function(e) {
                if (that.option.addLineNum == 1) {
                    if (!that.option.deleteLast) {
                        if (typeof that.option.deleteback === "function") {
                            that.option.deleteback.call(that, that.$element.find("." + that.keyClass).length);
                        }
                        return;
                    }
                }
                that.minusRowspan();
                $(this).closest("tr").remove();
                that.option.addLineNum--;
                if (typeof that.option.deleteback === "function") {
                    that.option.deleteback.call(that, that.$element.find("." + that.keyClass).length);
                }
                return false;
            });
        },
        /**
         * [deleteLastLine 删除一行]
         * @return {[type]} [description]
         */
        deleteLastLine: function() {
            var that = this,
                trs = that.$element.find("." + that.keyClass);
            if (trs.length) {
                $(trs[trs.length - 1]).remove();
                that.minusRowspan();
                if (typeof that.option.deleteback === "function") {
                    that.option.deleteback.call(that, that.$element.find("." + that.keyClass).length);
                }
            }
        },
        /**
         * [addRowspan 检查是否含有跨列]
         * @param {[type]} obj [description]
         */
        addRowspan: function(obj) {
            var objs = this.$element.find(this.option.checkRow);
            if (objs.length) {
                var obj = objs[objs.length - 1];
                obj.setAttribute("rowspan", (parseInt(obj.getAttribute("rowspan"), 10) + 1));
            }
        },
        minusRowspan: function(obj) {
            var objs = this.$element.find(this.option.checkRow);
            if (objs.length) {
                var obj = objs[objs.length - 1];
                obj.setAttribute("rowspan", (parseInt(obj.getAttribute("rowspan"), 10) - 1));
            }
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

    DynamicRow.v = "1.0";

    var Dynrow = DynamicRow;

    "function" == typeof define ? define(function() {
        return Dynrow;
    }) : "undefined" != typeof exports ? module.exports = Dynrow : window.Dynrow = Dynrow;
})(jQuery);