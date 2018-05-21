// Draw a circle in a given context with a given radius
function drawCircle(x, y, radius, ctx) {
  ctx.fillStyle = "#FF0000";
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fill();
}

// Check if a mouse click is within the resize handles
function checkCloseEnough(p1, p2) {
  return Math.abs(p1 - p2) < 5;
}



// By Simon Sarris
// www.simonsarris.com
// sarris@acm.org
//
// Last update December 2011
//
// Free to use and distribute at will
// So long as you are nice to people, etc

// Constructor for Shape objects to hold data for all drawn objects.
// For now they will just be defined as rectangles.
function Shape(x, y, w, h, fill) {
  // This is a very simple and unsafe constructor. All we're doing is checking if the values exist.
  // "x || 0" just means "if there is a value for x, use that. Otherwise use 0."
  // But we aren't checking anything else! We could put "Lalala" for the value of x 
  this.x = x || 0;
  this.y = y || 0;
  this.w = w || 1;
  this.h = h || 1;
  this.fill = fill || '#AAAAAA';
  // Drag booleans to check if the shae is being resized
  this.dragTL = false;
  this.dragTR = false;
  this.dragBL = false;
  this.dragBR = false;
}

// Draws this shape to a given context
Shape.prototype.draw = function(ctx) {
  ctx.fillStyle = this.fill;
  ctx.fillRect(this.x, this.y, this.w, this.h);
}

// Determine if a point is inside the shape's bounds
Shape.prototype.contains = function(mx, my) {
  // All we have to do is make sure the Mouse X,Y fall in the area between
  // the shape's X and (X + Width) and its Y and (Y + Height)
  // Adding and subtracting 5 to correct for the resize handles
  // TODO: Find a better way to account for the resize handles
  return  (this.x - 5 <= mx) && (this.x + this.w + 5 >= mx) &&
          (this.y - 5 <= my) && (this.y + this.h + 5 >= my);
}

// Function used to set a reference to the canvasState that the shape is added to
// Called in CanvasState.addShape
// sets the this.canvasState property of the shape
Shape.prototype.setCanvasState = function(canvasState) {
  this.canvasState = canvasState;
}

// Sets the id of the shape
// Gets called in CanvasState.addShape after shape.setCanvasState 
// Id uniqueness handled in CanvasState.addShape
Shape.prototype.setId = function(id) {
  this.id = id;
}


// Draws the handles of the Shape for resizing
Shape.prototype.drawHandles = function(radius, ctx) {
  drawCircle(this.x, this.y, radius, ctx);
  drawCircle(this.x + this.w, this.y, radius, ctx);
  drawCircle(this.x, this.y + this.h, radius, ctx);
  drawCircle(this.x + this.w, this.y + this.h, radius, ctx);
}

// Resets the handles, the shape is not being resized
Shape.prototype.resetHandles = function() {
  this.dragTR = this.dragTL = this.dragBR = this.dragBL = false;
}

Shape.prototype.reflect = function(x,y) {

}


// Resizes the shape with (x,y) as an anchor point relative to canvas
// Negative values of w and h will reflect the shape across the anchor point
Shape.prototype.resize = function(w,h,x,y) {
  // Currently haven't done inversion and haven't considered the case where the anchor point is not contained in the shape
  console.log(w);
  let relX = x - this.x;
  let relY = y - this.y;
  let deltaW = w - this.w;
  let deltaH = h - this.h;
  let deltaX = deltaW*relX/this.w || 0;
  let deltaY = deltaH*relY/this.h || 0;
  this.w = Math.abs(w);
  this.h = h;
  this.x -= deltaX + (w<0 ? (this.x + this.w  - x) : 0);
  this.y -= deltaY; // + (h<0 ? (this.y + this.h  - y) : 0);

}

function CanvasState(canvas) {
  // **** First some setup! ****
  
  this.canvas = canvas;
  this.width = canvas.width;
  this.height = canvas.height;
  this.ctx = canvas.getContext('2d');
  // This complicates things a little but but fixes mouse co-ordinate problems
  // when there's a border or padding. See getMouse for more detail
  var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
  if (document.defaultView && document.defaultView.getComputedStyle) {
    this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10)      || 0;
    this.stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10)       || 0;
    this.styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10)  || 0;
    this.styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10)   || 0;
  }
  // Some pages have fixed-position bars (like the stumbleupon bar) at the top or left of the page
  // They will mess up mouse coordinates and this fixes that
  var html = document.body.parentNode;
  this.htmlTop = html.offsetTop;
  this.htmlLeft = html.offsetLeft;

  // **** Keep track of state! ****
  
  this.valid = false; // when set to false, the canvas will redraw everything
  this.shapes = [];  // the collection of things to be drawn
  this.dragging = false; // Keep track of when we are dragging
  // the current selected object. In the future we could turn this into an array for multiple selection
  this.selection = null;
  this.dragoffx = 0; // See mousedown and mousemove events for explanation
  this.dragoffy = 0;

  this.maxId = 0; // maxId of a shape currently added to canvas. Auto-incremented in shape.setId which is called in canvasState.addShape

  this.shapeIds = {}; // Stores
  
  this.startX = 0;
  this.startY = 0;
  // **** Then events! ****
  
  // This is an example of a closure!
  // Right here "this" means the CanvasState. But we are making events on the Canvas itself,
  // and when the events are fired on the canvas the variable "this" is going to mean the canvas!
  // Since we still want to use this particular CanvasState in the events we have to save a reference to it.
  // This is our reference!
  var myState = this;
  
  //fixes a problem where double clicking causes text to get selected on the canvas
  canvas.addEventListener('selectstart', function(e) { e.preventDefault(); return false; }, false);
  // Up, down, and move are for dragging
  canvas.addEventListener('mousedown', function(e) {
    var mouse = myState.getMouse(e);
    var mx = mouse.x;
    var my = mouse.y;
    myState.startX = mx;
    myState.startY = my;
    var shapes = myState.shapes;
    var l = shapes.length;
    console.log(myState.save());
    // for (var i = l-1; i >= 0; i--) {
    //   if (shapes[i].contains(mx, my)) {
    //     var mySel = shapes[i];
    //     // Keep track of where in the object we clicked
    //     // so we can move it smoothly (see mousemove)
    //     myState.dragoffx = mx - mySel.x;
    //     myState.dragoffy = my - mySel.y;
    //     myState.dragging = true;
    //     myState.selection = mySel;
    //     myState.valid = false;
    //     return;
    //   }
    // }

    var selectionMade = shapes.some(function(shape) {
      if (shape.contains(mx, my)) {
        var mySel = shape;

        // Check if the chape is being resized not moved
        var radius = 5;

        if (checkCloseEnough(mx, mySel.x) && checkCloseEnough(my, mySel.y)) {
            mySel.dragTL = true;
            myState.anchorX = mySel.x + mySel.w;
            myState.anchorY = mySel.y + mySel.h;
        }
        // 2. top right
        else if (checkCloseEnough(mx, mySel.x + mySel.w) && checkCloseEnough(my, mySel.y)) {
            mySel.dragTR = true;

        }
        // 3. bottom left
        else if (checkCloseEnough(mx, mySel.x) && checkCloseEnough(my, mySel.y + mySel.h)) {
            mySel.dragBL = true;

        }
        // 4. bottom right
        else if (checkCloseEnough(mx, mySel.x + mySel.w) && checkCloseEnough(my, mySel.y + mySel.h)) {
            mySel.dragBR = true;
            myState.anchorX = mySel.x;
            myState.anchorY = mySel.y;
        }
        // (5.) none of them
        else {
            // handle not resizing
        }

        // Keep track of where in the object we clicked
        // so we can move it smoothly (see mousemove)
        myState.dragoffx = mx - mySel.x;
        myState.dragoffy = my - mySel.y;
        // If the handles are clicked, do not drag the shape
        myState.dragging = true && !(mySel.dragBR || mySel.dragBL || mySel.dragTR || mySel.dragTL);
        myState.selection = mySel;
        myState.valid = false;

        console.log("Seelcted" + mySel.id);

        return true;
      }   
    });

    if (selectionMade) return;

    // havent returned means we have failed to select anything.
    // If there was an object selected, we deselect it
    if (myState.selection) {
      myState.selection = null;
      myState.valid = false; // Need to clear the old selection border
    }
  }, true);
  canvas.addEventListener('mousemove', function(e) {
    var mySel = myState.selection;
    var mouse = myState.getMouse(e);
    if (myState.dragging){
      // We don't want to drag the object by its top-left corner, we want to drag it
      // from where we clicked. Thats why we saved the offset and use it here
      myState.selection.x = mouse.x - myState.dragoffx;
      myState.selection.y = mouse.y - myState.dragoffy;   
    }
    else if (mySel && mySel.dragTL) {
      // mySel.w += mySel.x - mouse.x;
      // mySel.h += mySel.y - mouse.y;
      // mySel.x = mouse.x;
      // mySel.y = mouse.y;
      let wNew;
      let hNew;
      if (mySel.x < myState.anchorX) wNew= mySel.w + mySel.x - mouse.x;
      else wNew = mouse.x - mySel.x;
      if (mySel.y < myState.anchorY) hNew = mySel.h + mySel.y - mouse.y;
      else hNew = mouse.y - mySel.y;
      mySel.resize(wNew,hNew, myState.anchorX, myState.anchorY);
    }
    else if (mySel && mySel.dragTR) {
      mySel.w = mouse.x -mySel.x;
      mySel.h += mySel.y - mouse.y;
      mySel.y = mouse.y;
    }
    else if (mySel && mySel.dragBL) {
      mySel.w += mySel.x - mouse.x;
      mySel.h = Math.abs(mySel.y - mouse.y);
      mySel.x = mouse.x;
    }
    else if (mySel && mySel.dragBR) {
      // mySel.w = Math.abs(mySel.x - mouse.x);
      // mySel.h = Math.abs(mySel.y - mouse.y);
      mySel.resize(mouse.x - mySel.x, mySel.h, myState.anchorX, myState.anchorY);
    }
    else {
      var newShape = Shape(startX, startY, Math.abs(startX - mouse.x), Math.abs(startY - mouse.y));
      console.log("New Shape:");
      console.log(newShape);
    }
    // // TODO: change it. just a quick hack to get inversion to work. so many better ways to do this
    // if (mySel) {
    //   if (mySel.w <= 0) {
    //     mySel.w *= -1;
    //     temp = mySel.dragTL;
    //     mySel.dragTL = mySel.dragTR;
    //     mySel.dragTR = temp;
    //     temp = mySel.dragBL;
    //     mySel.dragBL = mySel.dragBR;
    //     mySel.dragBR = temp;
    //   }
    //   if (mySel.h < 0) {
    //     mySel.h *= -1;
    //     temp = mySel.dragTL;
    //     mySel.dragTL = mySel.dragBL;
    //     mySel.dragBL = temp;
    //     temp = mySel.dragTR;
    //     mySel.dragTR = mySel.dragBR;
    //     mySel.dragB = temp;
    //   }
    // }
    myState.valid = false; // Something's dragging or being resized so we must redraw
  }, true);
  canvas.addEventListener('mouseup', function(e) {
    myState.dragging = false;
    myState.selection.resetHandles();
    //if (myState.selection.w < 0) myState.selection.w *= -1;

  }, true);
  // double click for making new shapes

  // NEW: Changing the dblclick event to insert a custom shape

  canvas.addEventListener('dblclick', function(e) {
    var mouse = myState.getMouse(e);
    myState.addShape(new Shape(mouse.x - 10, mouse.y - 10, document.getElementById("width").value, document.getElementById("height").value, 'rgba(0,255,0,.6)'));
    // document.getElementById("sample").style.height = document.getElementById("height").value + "px";
    // document.getElementById("sample").style.width = document.getElementById("width").value + "px";
  }, true);

  // canvas.addEventListener('dblclick', function(e) {
  //   var mouse = myState.getMouse(e);
  //   myState.addShape(new Shape(mouse.x - 10, mouse.y - 10, 20, 20, 'rgba(0,255,0,.6)'));
  // }, true);

  // END NEW
  
  // **** Options! ****
  
  this.selectionColor = '#CC0000';
  this.selectionWidth = 2;  
  this.interval = 30;
  setInterval(function() { myState.draw(); }, myState.interval);
}

// CanvasState.prototype.addShape = function(shape) {
//   this.shapes.push(shape);
//   shape.setCanvasState = this;
//   this.valid = false;
// }

// Adds a shape to the canvas.
// If id is passed it checks if a shape with the same id already exists and if it does retrns false
// If no shape with same id exists, adds the shape to shapes with index = id
// otherwise pushes the shape to end of shapes making the id shapes.length
CanvasState.prototype.addShape = function(shape, id) {
  if (id) {
    if (this.shapes[id]) {
      return false;
    }
    this.shapes[id] = shape;
    shape.setId(id);
  } else {
    shape.setId(this.shapes.length);
    this.shapes.push(shape);
  }
  // shape.setCanvasState(this);
  this.valid = false;
  return true;

}

CanvasState.prototype.clear = function() {
  this.ctx.clearRect(0, 0, this.width, this.height);
}

// While draw is called as often as the INTERVAL variable demands,
// It only ever does something if the canvas gets invalidated by our code
CanvasState.prototype.draw = function() {
  // if our state is invalid, redraw and validate!
  if (!this.valid) {
    var ctx = this.ctx;
    var shapes = this.shapes;
    this.clear();
    
    // ** Add stuff you want drawn in the background all the time here **
    
//    draw all shapes
    // var l = shapes.length;
    // for (var i = 0; i < l; i++) {
    //   var shape = shapes[i];
    //   // We can skip the drawing of elements that have moved off the screen:
    //   if (shape.x > this.width || shape.y > this.height ||
    //       shape.x + shape.w < 0 || shape.y + shape.h < 0) continue;
    //   shapes[i].draw(ctx);
    // }

    shapes.forEach(function(shape, i) {
      if (shape.x > this.width || shape.y > this.height ||
          shape.x + shape.w < 0 || shape.y + shape.h < 0) return;
      shapes[i].draw(ctx);     
    });
    
    // draw selection
    // right now this is just a stroke along the edge of the selected Shape
    // Also will draw the handles for the selected shape for resizing
    if (this.selection != null) {
      ctx.strokeStyle = this.selectionColor;
      ctx.lineWidth = this.selectionWidth;
      var mySel = this.selection;
      ctx.strokeRect(mySel.x,mySel.y,mySel.w,mySel.h);
      mySel.drawHandles(5, ctx);
    }
    
    // ** Add stuff you want drawn on top all the time here **
    
    this.valid = true;
  }
}


// Creates an object with x and y defined, set to the mouse position relative to the state's canvas
// If you wanna be super-correct this can be tricky, we have to worry about padding and borders
CanvasState.prototype.getMouse = function(e) {
  var element = this.canvas, offsetX = 0, offsetY = 0, mx, my;
  
  // Compute the total offset
  if (element.offsetParent !== undefined) {
    do {
      offsetX += element.offsetLeft;
      offsetY += element.offsetTop;
    } while ((element = element.offsetParent));
  }

  // Add padding and border style widths to offset
  // Also add the <html> offsets in case there's a position:fixed bar
  offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
  offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;

  mx = e.pageX - offsetX;
  my = e.pageY - offsetY;
  
  // We return a simple javascript object (a hash) with x and y defined
  return {x: mx, y: my};
}

// Exports (saves) all the shapes in our canvasState in a json array of objects 
// with the format {x:x , y:y, w:w, h:h, id:id}
CanvasState.prototype.save = function() {
  // TODO Handle case when there are no shapes added.
  var shapes = this.shapes;
  var length = shapes.length;

  //This works but not using it for now because it serializes with fill property and 
  // dunno if we're going to use that
  // return(JSON.stringify(shapes));

  return JSON.stringify(shapes.map(function(shape, id) {
    var shapeObj = {};
    shapeObj['x'] = shape['x'];
    shapeObj['y'] = shape['y'];
    shapeObj['w'] = shape['w'];
    shapeObj['h'] = shape['h'];
    shapeObj['id'] = id;
    return shapeObj;
  }));

}

// Imports (Loads) a canvasState from a json array of objects
// with the format {x:x , y:y, w:w, h:h, id:id}
CanvasState.prototype.load = function(json) {
  // TODO Handle case where json is invalid or empty
  var length = json.length;
  // Remove all shapes currently on canvas
  this.shapes = [];
  for(var i = 0; i < length; i++) {
    var shapeObj = json[i];
    // TODO handle invalid values
    var x = shapeObj['x'];
    var y = shapeObj['y'];
    var w = shapeObj['w'];
    var h = shapeObj['h'];
    var id = shapeObj['id'];
    this.addShape(new Shape(x,y,w,h), id);
  }


}

// If you dont want to use <body onLoad='init()'>
// You could uncomment this init() reference and place the script reference inside the body tag
//init();

function init() {
  var s = new CanvasState(document.getElementById('canvas1'));
  s.addShape(new Shape(40,40,50,50)); // The default is gray
  s.addShape(new Shape(60,140,40,60, 'lightskyblue'));
  // Lets make some partially transparent
  s.addShape(new Shape(80,150,60,30, 'rgba(127, 255, 212, .5)'));
  s.addShape(new Shape(125,80,30,80, 'rgba(245, 222, 179, .7)'));
}