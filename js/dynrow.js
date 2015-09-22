/**
 @Name   : dynrow v1.0 - 动态添加行插件
 @Author : 戈志刚
 @Date   : 2015-9-22
 @Site   ：http://dynrow.github.io
 @License：Apache License2.0
 */
!(function($) {
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
            var x = 1000,
                y = 10;
            this.keyClass = this.guid();
            this.isRow = !0;
            this.addClickLine();
            this.deleteLine();
            this.echoListLine();
        },
        DEFAULT: {
            id: "",
            addNextId: null,
            selector: "tr [data-table='row']",
            params: null,
            deflutOne: true,
            addLineNum: 0,
            deleteLast: true,
            callback: null,
            deleteback: null,
            echoData: null
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
            $(obj).after(template);
            this.option.addLineNum++;
            //检查是否含有跨列
            if (this.isRow) this.addRowspan();
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
                that.getLaytpl(that.option.id, that.option.params, function(html) {
                    var obj = that.$element.find("." + that.keyClass);
                    if (obj.length === 0) {
                        obj = that.getAddDom();
                    }
                    that.addLine(obj[obj.length - 1], html);
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
            obj ? that.insertData(obj) : that.addOneLine();
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
            if ($.fill) {
                $("#formTest").fill(obj);
            } else {
                throw Error('回显数据没有引用jquery.fill.js');
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
        /**
         * [addOneLine 添加一行]
         */
        addOneLine: function() {
            var that = this;
            if (that.option.deflutOne) {
                that.getLaytpl(that.option.id, that.option.params, function(html) {
                    var obj = that.getAddDom();
                    that.addLine(obj, html);
                });
            }
        },
        /**
         * [getAddDom 获取dom]
         * @return {[type]} [description]
         */
        getAddDom: function() {
            var that = this,
                dom = that.$element.find("." + that.keyClass);
            if (dom.length === 0) {
                dom = that.$element.find("#" + that.option.addNextId);
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
            var objs = this.$element.find("[data-table='rowspan']");
            if (objs.length) {
                var obj = objs[objs.length - 1];
                obj.setAttribute("rowspan", (parseInt(obj.getAttribute("rowspan"), 10) + 1));
            }
        },
        minusRowspan: function(obj) {
            var objs = this.$element.find("[data-table='rowspan']");
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