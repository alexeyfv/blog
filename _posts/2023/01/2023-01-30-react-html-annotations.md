---
layout: post
title: "How to create text annotations using React and TypeScript "
date: 2023-01-27
tags: typescript react
---

I changed my job last november and became Full Stack Developer in a new team. Now I have lots of work related with frontend, espesially with `React` and `TypeScript`. A few weeks ago, I had a task to implement annotations support in our application that we are developing. This article briefly describes the approaches that can be used to create an application with text annotations.

## What is required?

Let's imagine that we have the following text content:

<img src="{{site.baseurl}}/assets/2023/01/2023-01-30-react-html-annotations/image01.png" alt="content">

We need to implement functionality that allows user to add text annotations on the selected part of content. For example such functionality in Google Docs:

<img src="{{site.baseurl}}/assets/2023/01/2023-01-30-react-html-annotations/image02.png" alt="content">

To do that we should understand how to get information about selected text, how to save and restore it and how to highlight selected part of the text if the user adds annotation to it.

## Selection and Ranges

DOM standart [describes](https://dom.spec.whatwg.org/#ranges) interface named `Range` which represents part of the content between two boundary points. Using `Range` we can easily get the information about selection. To do that just call `getSelection` and then `getRangeAt`:

``` typescript
const s = window.getSelection();
const range = s.getRangeAt(0);
```

Parameter `range` is of interface `Range`. This interface inherits another interface `AbstractRange` which looks like:

``` typescript
interface AbstractRange {
  /** Returns true if range is collapsed, and false otherwise. */
  readonly collapsed: boolean;
  /** Returns range's end node. */
  readonly endContainer: Node;
  /** Returns range's end offset. */
  readonly endOffset: number;
  /** Returns range's start node. */
  readonly startContainer: Node;
  /** Returns range's start offset. */
  readonly startOffset: number;
}
```

The most important fields are `startContainer`, `startOffset`, `endContainer`, `endOffset`. These fields just determine selection. Let's look at HTML code of the content that was shown above:

``` html
<div id="root"> 
  <div>
    <h5>What is Lorem Ipsum?</h5>
    <p>
      <strong>Lorem Ipsum</strong> is simply dummy text of the printing and
      typesetting industry. Lorem Ipsum has been the industry's standard dummy
      text ever since the 1500s, when an unknown printer took a galley of type
      and scrambled it to make a type specimen book. It has survived not only
      five centuries, but also the leap into electronic typesetting, remaining
      essentially unchanged. It was popularised in the 1960s with the release of
      Letraset sheets containing Lorem Ipsum passages, and more recently with
      desktop publishing software like Aldus PageMaker including versions of
      Lorem Ipsum.
    </p>
  </div>
</div>
```

For the considered example selection range will be:

| Field            | Value                     |
| ---------------- | ------------------------- |
| `startContainer` | `#text` (child of `<h5>`) |
| `startOffset`    | `12`                      |
| `endContainer`   | `#text` (child of `<p>`)  |
| `endOffset`      | `74`                      |

Now let's look at `startContainer` and `endContainer` in a different way. The nodes that stored by these fields can be determined by their indexes in the child arrays of the DOM tree. It means, that we can determine the addresses of the start and end nodes relative to the `root` node by recuresively traversing the DOM tree. Thus, the addresses will be `[0, 0, 0, 0]`, `[1, 1, 0, 0]` for `startContainer` and `endContainer` respectively:

``` text
[0] <div id="root">
 |
 ╵--[0] <div>
     |
     |-- [0] <h5>
     |    |
     |    ╵--[0] #text <-- startContainer (startOffset: 12) 
     |
     ╵-- [1] <p>
          |
          |--[0] <strong>
          |
          |--[1] #text <-- endContainer (endOffset: 74) 
          |
         ...
```

This approach allows us to save selection data in the following class:

``` typescript
class SelectionData {
  startNode: number[];
  endNode: number[];
  startTextOffset: number;
  endTextOffset: number;

  // other members
}
```

Functions for serializing `Range` to `SelectionData` and vice versa you can find [here](https://github.com/alexeyfv/react-html-annotations/blob/main/src/hooks/useSelection.ts).

## Content highlighting

Now we know how to save and restore information about selection, but how we can highlight the selected content? Function `getClientRects` will help us with that. This function returns list of `DOMRect` objects.

``` typescript
interface Range extends AbstractRange {
  getClientRects(): DOMRectList;

  // other members
}
```

In our case `DOMRect` describes the size and position of the selected area of content.

``` typescript
interface DOMRectReadOnly {
  readonly bottom: number;
  readonly height: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
  toJSON(): any;
}

interface DOMRect extends DOMRectReadOnly {
  height: number;
  width: number;
  x: number;
  y: number;
}
```

Thus, using `top`, `left`, `height` and `width` we can create, for example, a `<div>` element with calculated position and size to highlight the content. In a `React` app, highlighting can be implemented something like this:

``` typescript
// Highlighting component
export default function Highlighting(props: {
  highlighting: HighlightingData;
}) {
  return <div style={styleHighlighting(props.highlighting)} />;
}

const styleHighlighting = (h: HighlightingData) => {
  const s: CSSProperties = {
    position: "absolute",
    border: `1.5px solid darkgreen`,
    borderRadius: "5px",
    padding: "2px",
    top: `${h.top}px`,
    left: `${h.left - 2}px`,
    width: `${h.width + 4}px`,
    height: `${h.height}px`,
  };
  return s;
};

// Determines highlighted area
class HighlightingData {
  top: number = 0;
  left: number = 0;
  right: number = 0;
  bottom: number = 0;
  width: number = 0;
  height: number = 0;
}
```

## Demo sandbox

The approaches described in this article were implemented in a demo application. You can find the source code in my [GitHub profile](https://github.com/alexeyfv/react-html-annotations) as well as in the sandbox below.

<iframe
  src="https://codesandbox.io/embed/wandering-water-3rum90?autoresize=1&fontsize=14&hidenavigation=1&theme=dark&view=preview"
  style="
    width: 100%;
    height: 500px;
    border: 0;
    border-radius: 4px;
    overflow: hidden;
  "
  title="react-html-annotations-sandbox"
  allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
  sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
></iframe>
