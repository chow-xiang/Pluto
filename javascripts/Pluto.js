//////write by : chow young
/*
**********************************原型：*********************************
*   关于处理值的过程
*                                define (String controllerName)
*                                    *
*                                    * (查找所有model)
*                                    ↓ 
*                   **************************************
*                   *                                    * 
*                 model(根据name属性)              element.value :
*                   *                                ↑       *
*                   *                                *       *
*                   **********************************       *
*                                                      value值发生变化时
*                                                            ↓  
*                       *****************************************************************
*                       *事件驱动                *修改value值                           *requestAnimationFrame : each(model) : $check(element)
*                       ↓                        ↓(可以取得底层修改value值的方法)       ↓(针对取不出底层方法)
*                       **************************                                      *
*                                   *                                                   *
*                                   *                                                   *
*                                   *                                                   *
*                                   *                                                   *
*                                   *                                                   *
*                                   *****************************************************
*                                   *
*                                   *                
*                                   ↓                                   
*                               each(  $scope.$handlers[modelName] ) : handler()
*
*
* 
*              
*  ps:model本质是虚值，因为其get了element的value值，set触发element修改的value
* 
*
*
*
*
*
*
*
* 
*                                                              
* 
*
*
***********************正则********************************
* 检查是否以modelName开头 , /^a:(\S*)$/.exec("a:ccc")
***********************************************************
**/



/**
 ************************************************************
 * Pluto主体部分 begin
 */
 /*查找所有的element*/
function allDom(element){
    var result = [];
    var walker = document.createTreeWalker(element,NodeFilter.SHOW_ALL,null,false);
    var node = walker.nextNode();
    while(node){
        result.push(node);
        node = walker.nextNode();
    }
    return result;
}

/*关于绑定事件的方法*/
var on = function(){
    var onString;
    if(document.addEventListener){
        onString = ["element","type","callback","useCapture",
                    "'use strict';" +
                    "element.addEventListener(type,callback,useCapture);"];
    }else{
        onString = ["element","type","callback","'use strict';" +
                    "element.attachEvent('on' + type,callback)"];
    }
    return Function.apply(function(){},onString);
}();

/*关于element绑定的事件列表*/
var bindEvents = function(){
    /*判断是不是ie浏览器*/
    if(!/MSIE ([\d.]+)/.exec(navigator.userAgent)){
        return {
            "text" : ["input","compositionstart","compositionend","DOMAutoComplete"],
            "textarea" : ["input","compositionstart","compositionend","DOMAutoComplete"],
            "select-one" : ["change"],
            "select-multiple" : ["change"],
            "radio" : ["click"],
            "checkbox" : ["change"],
            "password" : []
        }
    }else{
        return {
            "text" : ["input","selectionchange"],
            "textarea" : ["input","compositionstart","compositionend","DOMAutoComplete"],
            "select-one" : ["change"],
            "select-multiple" : ["change"],
            "radio" : ["click"],
            "checkbox" : ["change"],
            "password" : []
        }
    }
}();





var PlutoUtils = {
    initConfig : function(){
        /*将array的push方法添加到NodeList对象上去*/
        // NodeList.prototype.push = Array.prototype.push;

        PlutoUtils.config = {
            "hadOverideElementGetSet" : false,
            "oberve" : void 0
        }

        /*查看是否能取到底层的set方法*/
        PlutoUtils.config["hadOverideElementGetSet"] = false;
        if( Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value") ){
            PlutoUtils.config["hadOverideElementGetSet"] = true;
        }
        /*自我修正*/
        this.$newGetSetAdaptor();

        /*根据浏览器判断各种元素需要绑定的事件*/
    },
    /**
     * 关于元素value的重写过程
     * @param  String type : 标记符，需要哪种重写方法
     * @return {} newGetSet : get : 新的get方法 ; set : 新的set方法 ;
     */
    $newGetSetAdaptor : function(/*String*/ sign){
        /*匹配方法*/
        /*各种类型的元素value值得get/set方法*/
        var Get = {
            "input" : function(){
                return this.getAttribute("value");
            }
        };
        var Set = {
            "input" : function(val){
                this.setAttribute("value",val);
            }
        };
        return {
            "get" : Get[sign],
            "set" : Set[sign]
        }
    },
    $modelFactory : function(controllerNode,element,name){
        function $model(controllerNode,element,name){
            this.controllerNode = controllerNode;
            this.element = element;
            this.name = name;
            this.$events = [];
            this.$dependence = [];
        }
        $model.prototype = {
            /**
            *element依赖于这个model
            *@param : dependenceElement : 元素
            *@param : sign : 元素是不是text类型
            */
            $sub : function(dependenceElement){
                var tag = this;
                var dependProcess = {
                    "normal" : function(dependenceElement){
                        var $map = {"$element" : dependenceElement,"$attr" : []};
                        for(var i=0 ;i<dependenceElement.attributes.length;i++){
                            if(dependenceElement.attributes[i].value === "{{" + tag.name +"}}"){
                                $map.$attr.push(dependenceElement.attributes[i].name);
                            }
                        }
                        /*迭代 注入*/
                        !!$map.$attr.length && $map && tag.$dependence.push($map);
                    },
                    "#text" : function(dependenceElement){
                        var $map = {"$element" : dependenceElement,"$attr" : [],"$prop" : []};
                        var sign = "{{" + tag.name + "}}"
                            ,start = dependenceElement.textContent.indexOf(sign)
                            ,end = start + sign.length;
                        if(start != -1){
                            /*生成新的元素*/
                            var frag = document.createDocumentFragment();
                            /*左边的*/
                            var l = document.createTextNode( dependenceElement.textContent.slice(0,start) );
                            frag.appendChild(l);
                            /*中间的*/
                            var modelSignNode = document.createTextNode( tag.name );
                            frag.appendChild(modelSignNode);
                            /*右边的*/
                            var r = document.createTextNode(dependenceElement.textContent.slice(end + 1,dependenceElement.textContent.length));
                            frag.appendChild( r );
                            /*先替换旧的文本元素*/
                            dependenceElement.parentNode.replaceChild(frag,dependenceElement);
                            /*注入特定的文本元素*/
                            $map.$element = modelSignNode;
                            $map.$attr.push("data");
                        }
                        /*迭代 注入*/
                        !!$map.$attr.length && $map && tag.$dependence.push($map);
                    }
                };
                /*适配一个方法*/
                var sign = dependenceElement.nodeName === "#text" ? "#text" : "normal";
                dependProcess[sign](dependenceElement);
            },
            $unSub : function(dependenceElement){

            },
            $addHandler : function(callback){
                this.$events.push(callback);
            },
            $pub : function(element){
                var handlers = this.$events;
                for(var i=0;i<handlers.length;i++){
                    handlers[i]( this ,element);
                }
            },
            $boundEventEngine : function(callback){
                var eventNames = bindEvents[ this.element.type ];
                for(var i=0;i<eventNames.length;i++){
                    if(eventNames[i] === "selectionchange"){
                        on(document,"selectionchange",callback,false);
                        continue;
                    }
                    on(this.element,eventNames[i],callback,false);
                }
            }
        }
        return new $model(controllerNode,element,name);
    },
    /*主要是业务代码*/
    $controllerFactorty : function(controllerName){
        function Controller(controllerName){
            
            var controllerElement = document.querySelector("[p-controller = " + controllerName + "]");

            this.$models = this.$scanController(controllerElement,controllerName);
            this.name = controllerName;
            this.node = controllerElement;
        };
        Controller.prototype = {
            /**
             * 扫描元素，$models注入依赖
             * @param  HTML controllerElement : controller元素
             * @param  String controllerName : controller名称
              @param  String controllerName : controller名称
             * @return [] $dependenceMap : 刷新涉及的元素以及它的属性
             */
            $scanController : function(controllerElement,controllerName){
                var modelElements = controllerElement.querySelectorAll("[p-controller = " + controllerName + "] [p-model]")
                    ,models = {};
                for(var i=0;i<modelElements.length;i++){
                    var modelName = modelElements[i].getAttribute("p-model");
                    models[ modelName ] = PlutoUtils.$modelFactory(controllerElement, modelElements[i] ,modelName);
                }
                
                var childrens = allDom(controllerElement);
                /*逐个扫描*/
                for(var i=0;i<childrens.length;i++){
                    for(var key in models){    
                        models[key].$sub(childrens[i]);
                    }
                }
                return models;
            }
        };
        
        return new Controller(controllerName);
    },
    /*主要是暴露使用的一些功能代码*/
    $scopeFactory : function(controllerName){
        /*不让对外，闭包起来*/
        var controller = this.$controllerFactorty(controllerName);
        
        function Scope(){
            var models = controller.$models
                ,tag = this;
            for(var key in models){
                var element = models[key].element;
                +function(element){
                    tag.$injectElement(element);
                }(element);
            }
            
        }
        /*对外开放的功能*/
        Scope.prototype = {
            /**
             * 将callback压入handler数组
             * @param  String modelName : 要监听的哪个model
             * @param Function callback : 要压入的handler
             */
            $watch : function(modelName,callback){
                controller.$models[modelName].$events.push( callback.bind(this) );
            },
            /**
             * 将元素注入scope的依赖 注意 ：如果你注入的元素对应的model已存在，会覆盖原先的element
             * @param  HTML element
             * @param  Function callback
             */
            $injectElement : function(element){
                var injectModelName = element.getAttribute("p-model")
                    ,models = controller.$models
                    ,tag = this;

                // /*如果该model已被初始化*/
                if( !!models[injectModelName] ){
                    /*新的ge/set方法*/
                    var newGetSet
                    if(PlutoUtils.config.hadOverideElementGetSet){
                        newGetSet = {
                            "get" : Object.getOwnPropertyDescriptor(element.constructor.prototype,"value").get,
                            "set" : function(val){
                                Object.getOwnPropertyDescriptor(element.constructor.prototype,"value").set.call(this,val);
                                models[this.getAttribute("p-model")].$pub(this);
                            }
                        };
                    }
                    // else{
                    //     newGetSet = PlutoUtils.$newGetSetAdaptor("input");
                    // }
                    /*覆盖改元素的get/set方法*/
                    newGetSet && Object.defineProperty(element,"value",newGetSet);
                    /*覆盖model的get/set方法与element联系起来*/
                    Object.defineProperty(tag,injectModelName,{
                        get : function(){
                            return models[injectModelName].element.value;
                        },
                        set : function(val){
                            models[injectModelName].element.value = val;
                            models[injectModelName].$pub(this);
                        }
                    });
                    /*将model发生变化时，改变element的value以及刷新页面的事件注入handlers*/
                    tag.$watch(injectModelName,function(model,element){
                        var maps = model.$dependence
                            ,value = eval("this['" + model.name + "']");
                        for(var i=0;i<maps.length;i++){
                            var map = maps[i];
                            /*attr*/
                            for(var j=0;j<map.$attr.length;j++){
                                map.$element[map.$attr[j]] = value;
                            }
                        }
                    });
                    /*元素绑定事件*/
                    models[injectModelName].$boundEventEngine(function(){
                        models[injectModelName].$pub(this);
                    });
                }
                /*如果没有*/
                else{
                    controller = this.$controllerFactorty(controllerName);
                    this.$injectElement(element);
                }
            },
            $toDepend : function(deoendElement,modelName){
                /*判断modelname是不是字符串，统一改成数组操作*/
                modelName.push || ( modelName = [modelName] );

                for(var i=0;i<modelName.length;i++){
                    var model = controller.$models[modelName[i]];
                    /*不存在继续循环*/
                    // !!model || continue;

                    /*存在注入依赖*/
                    /*首先扫描元素以及*/
                }
            }
        };

        return new Scope;
    }
}



var Pluto = {
    /**
     * 主要函数，define一个controller出来
     * @param  String controllerName : controller的名称
     * @param  Function controllerManager : 给用户自定义的回调函数
     */
    define : function(/*String*/ controllerName , /*Function*/ controllerManager){
        /*生成一个$controller*/
        var $scope = PlutoUtils.$scopeFactory(controllerName);
        /*回调*/
        controllerManager($scope);
        return this;
    }
};
/**
 *
 * Pluto主体部分end
 * ***********************************************************/
 
 PlutoUtils.initConfig();
