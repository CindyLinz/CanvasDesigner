var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var editor = document.getElementById('edit');
var err = document.getElementById('error');
var control = document.getElementById('control');
var hideTab = {};
var valTab = {};
var symTab = {};

var raf = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.oRequestAnimationFrame;

var drawCanvas = function(){
  var w = 100, h = 100, key, val;
  if( valTab.width && valTab.width[0]==='num' ) w = valTab.width[1];
  if( valTab.height && valTab.height[0]==='num' ) h = valTab.height[1];
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#0f0';
  ctx.lineWidth = 1;
  for( key in valTab ){
    if( hideTab[key] )
      continue;
    val = tuple2Pt(valTab[key]);
    switch( val[0] ){
      case 'pt':
        ctx.beginPath();
        ctx.moveTo(val[1], val[2]);
        ctx.arc(val[1], val[2], 2, 0, Math.PI*2, true);
        ctx.fill();
        ctx.stroke();
        break;

      case 'seg':
        ctx.beginPath();
        ctx.moveTo(val[1][1], val[1][2]);
        ctx.lineTo(val[2][1], val[2][2]);
        ctx.stroke();
        break;

      case 'qdr':
        ctx.beginPath();
        ctx.moveTo(val[1][1], val[1][2]);
        ctx.quadraticCurveTo(val[2][1], val[2][2], val[3][1], val[3][2]);
        ctx.stroke();
        break;

      case 'bzr':
        ctx.beginPath();
        ctx.moveTo(val[1][1], val[1][2]);
        ctx.bezierCurveTo(val[2][1], val[2][2], val[3][1], val[3][2], val[4][1], val[4][2]);
        ctx.stroke();
        break;

      case 'arc':
        console.log(val);
        ctx.beginPath();
        ctx.moveTo(val[1][1] + val[2][1] * Math.cos(val[3][1]), val[1][2] + val[2][1] * Math.sin(val[3][1]));
        ctx.arc(val[1][1], val[1][2], val[2][1], val[3][1], val[4][1], val[5][1]);
        ctx.stroke();
        break;
    }
  }
}

var evalCanvas = function(){
  var key, val;
  var ctrlHTML = '';
  var errHTML = '';
  valTab = {};
  for( key in symTab ){
    try {
      if( valTab[key]===undefined )
        valTab[key] = symTab[key](0);
      val = valTab[key];
      if( !hideTab[key] )
        ctrlHTML += key + ' = ' + JSON.stringify(val) + '<br>';
    }
    catch(e){
      errHTML += '(' + key + ') ' + e + '<br>';
    }
  }
  control.innerHTML = ctrlHTML;
  err.innerHTML = errHTML;
  if( errHTML==='' )
    drawCanvas();
};

var tuple2Pt = function(tuple){
  if( tuple[0]==='tuple' && tuple.length===3 && tuple[1][0]==='num' && tuple[2][0]==='num' )
    return ['pt', tuple[1][1], tuple[2][1]];
  return tuple;
}

var parseCanvas = function(){
  var _lineNo = 0;
  var errHTML = '';
  var nextSym = 0;
  symTab = {
    PI: function(t){ return ['num', Math.PI] }
  };
  editor.value.replace(/^\s*(.*?)(?:|#.*?)[$\n]/gm, function($0, line){
    var lineNo = ++_lineNo;
    var match;


    if( line.match(/^\s*$/) )
      return;

    var thr = function(msg){
      throw 'line ' + lineNo + ': ' + msg + '<br>&nbsp;&nbsp;' + line;
    };

    var parseOne = function(src){
      var match;
      var name, params, args, i;
      if( match = src.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*$/) ){
        name = match[1];
        return function(t){
          if( symTab[name] ){
            if( valTab[name]===undefined )
              valTab[name] = symTab[name](t);
            return valTab[name];
          }
          else
            thr('unknown symbol "' + name + '"');
        };
      }

      if( match = src.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$/) ){
        name = match[1];
        params = match[2];
        return function(t){
          var i;
          if( symTab[params] ){
            args = symTab[params](t);
            if( args[0]!=='tuple' )
              thr('args should be vector of nums');

            if( Math[name]!==undefined ){
              args.shift();
              for(i=0; i<args.length; ++i){
                if( args[i][0]!=='num' )
                  thr('all args for Math method should be nums');
                args[i] = args[i][1];
              }
              return ['num', Math[name].apply(this, args)];
            }

            switch(name){
              case 'seg':
                if( args.length!==3 )
                  thr('there should be 2 arguments for seg');
                for(i=1; i<=2; ++i){
                  args[i] = tuple2Pt(args[i]);
                  if( args[i][0]!=='pt' )
                    thr('args for seg should be both pts');
                }
                return ['seg', args[1], args[2]];

              case 'bzr':
                if( args.length!==5 )
                  thr('there should be 4 arguments for bzr');
                for(i=1; i<=4; ++i){
                  args[i] = tuple2Pt(args[i]);
                  if( args[i][0]!=='pt' )
                    thr('args for bzr should be all pts');
                }
                return ['bzr', args[1], args[2], args[3], args[4]];

              case 'qdr':
                if( args.length!==4 )
                  thr('there should be 3 arguments for qdr');
                for(i=1; i<=3; ++i){
                  args[i] = tuple2Pt(args[i]);
                  if( args[i][0]!=='pt' )
                    thr('args for qdr should be all pts');
                }
                return ['qdr', args[1], args[2], args[3]];

              case 'arc':
                if( args.length!==6 )
                  thr('there should be 5 arguments for arc');
                args[1] = tuple2Pt(args[1]);
                if( args[1][0]!=='pt' || args[2][0]!=='num' || args[3][0]!=='num' || args[4][0]!=='num' || args[5][0]!=='num' )
                  thr('args for arc should be first pt and others nums');
                return ['arc', args[1], args[2], args[3], args[4], args[5]];

              default:
                thr('unknown function "' + name + '"');
            }
          }
          else
            thr('unknown symbol "' + params + '"');
        };
      }

      if( match = src.match(/^\s*(\d+\.?\d*|\.\d+)\s*$/) ){
        var val = parseFloat(match[1]);
        return function(t){
          return ['num', val];
        };
      }

      thr('unknown one "' + src + '"');
    };

    var parseTerm = function(src){
      var match;
      var firstTerm, mulTerm = [], divTerm = [];
      if( match = src.match(/^\s*([^/*]*)(.*)/) ){
        firstTerm = parseOne(match[1]);
        src = match[2];
      }
      else{
        thr('empty mul/div terms');
      }
      while(true){
        if( src.match(/^\s*$/) )
          break;
        if( match = src.match(/^\s*([/*])([^/*]*)(.*)/) ){
          src = match[3];
          (match[1]==='/' ? divTerm : mulTerm).push(parseOne(match[2]));
        }
        else{
          thr('unrecognized pattern "'+src+'"');
        }
      }
      if( mulTerm.length==0 && divTerm.length==0 )
        return firstTerm;

      return function(t){
        var firstVal, mulVal = [], divVal = [], i, val, x, y;
        firstVal = tuple2Pt(firstTerm(t));
        for(i=0; i<mulTerm.length; ++i){
          mulVal[i] = mulTerm[i](t);
          if( mulVal[i][0]!=='num' )
            thr('mulVal should be num');
        }
        for(i=0; i<divTerm.length; ++i){
          divVal[i] = divTerm[i](t);
          if( divVal[i][0]!=='num' )
            thr('divVal should be num');
        }
        switch( firstVal[0] ){
          case 'num':
            val = firstVal[1];
            for(i=0; i<mulVal.length; ++i)
              val *= mulVal[i][1];
            for(i=0; i<divVal.length; ++i)
              val /= divVal[i][1];
            return ['num', val];

          case 'pt':
            x = firstVal[1];
            y = firstVal[2];
            for(i=0; i<mulVal.length; ++i){
              x *= mulVal[i][1];
              y *= mulVal[i][1];
            }
            for(i=0; i<divVal.length; ++i){
              x /= divVal[i][1];
              y /= divVal[i][1];
            }
            return ['pt', x, y];

          default:
            thr('only num or pt could be mul or div');
        }
      };
    };

    var parseTuple = function(src){
      var term = [], i;
      src = src.split(/,/);
      if( src.length==1 ){
        if( src[0].match(/^\s*$/) )
          return function(t){
            return ['tuple'];
          }
        else
          return parseExpr(src[0]);
      }
      for(i=0; i<src.length; ++i)
        term[i] = parseExpr(src[i]);
      return function(t){
        var i, val = [];
        for(i=0; i<term.length; ++i)
          val[i] = term[i](t);
        val.unshift('tuple');
        return val;
      };
    };

    var parseExpr = function(src){
      var match;
      while( src.match(/\([^()]*\)/) ){
        src = src.replace(/\(([^()]*)\)/g, function($0, $1){
          var newSym = 'CanvasDesignerAutoID_' + ++nextSym;
          hideTab[newSym] = true;
          symTab[newSym] = parseTuple($1);
          return ' '+newSym+' ';
        });
      }
      if( src.match(/\(|\)/) )
        thr('unmatched parenthesis');

      var posTerm = [], negTerm = [];
      while(true){
        if( src.match(/^\s*$/) )
          break;
        if( match = src.match(/^\s*([+-]?)([^+-]*)(.*)/) ){
          src = match[3];
          (match[1]==='-' ? negTerm : posTerm).push(parseTerm(match[2]));
        }
        else{
          thr('unrecognized pattern "'+src+'"');
        }
      }
      if( posTerm.length==1 && negTerm.length==0 )
        return posTerm[0];
      if( posTerm.length==0 && negTerm.length==0 )
        thr('empty pos/neg terms');

      return function(t){
        var posVal = [], negVal = [], i, ty, val, x, y;
        for(i=0; i<posTerm.length; ++i){
          posVal[i] = tuple2Pt(posTerm[i](t));
          if( ty && ty!==posVal[i][0] )
            thr('all pos or neg val should be the same type');
          ty = posVal[i][0];
        }
        for(i=0; i<negTerm.length; ++i){
          negVal[i] = tuple2Pt(negTerm[i](t));
          if( ty && ty!==negVal[i][0] )
            thr('all pos or neg val should be the same type');
          ty = negVal[i][0];
        }
        switch(ty){
          case 'num':
            val = 0;
            for(i=0; i<posVal.length; ++i)
              val += posVal[i][1];
            for(i=0; i<negVal.length; ++i)
              val -= negVal[i][1];
            return ['num', val];

          case 'pt':
            x = y = 0;
            for(i=0; i<posVal.length; ++i){
              x += posVal[i][1];
              y += posVal[i][2];
            }
            for(i=0; i<negVal.length; ++i){
              x -= negVal[i][1];
              y -= negVal[i][2];
            }
            return ['pt', x, y];

          default:
            thr('only num or pt could be pos/neg');
        }
      };
    };

    try{
      if( match = line.match(/^\s*(_?)([a-zA-Z_][a-zA-Z0-9_]*)\s*=(.*)/) ){
        symTab[match[2]] = parseExpr(match[3]);
        if( match[1] )
          hideTab[match[2]] = true;
        else
          delete(hideTab[match[2]]);
      }
      else{
        thr('ill shaped line "' + line +'"');
      }
    }
    catch(e){
      errHTML += e + '<br>';
    }
  });
  err.innerHTML = errHTML;
  if( errHTML==='' ){
    evalCanvas();
  }
};

var queued = false;
editor.onkeyup = function(){
  if( queued )
    return;
  queued = true;
  raf(function(){
    queued = false;
    parseCanvas();
  });
};
parseCanvas();
