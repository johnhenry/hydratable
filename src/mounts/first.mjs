import unsuitable from "./unsuitable.mjs";
let target = window.document.body.firstChild;
if (
  !target ||
  target.nodeType !== Node.ELEMENT_NODE ||
  unsuitable.includes(target.tagName.toLowerCase())
) {
  target = window.document.createElement("div");
  window.document.body.prepend(target);
}
export default target;
