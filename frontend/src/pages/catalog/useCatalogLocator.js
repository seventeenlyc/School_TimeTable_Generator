import { useCallback, useEffect, useRef, useState } from "react";

function scheduleFrame(callback) {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    return { mode: "raf", id: window.requestAnimationFrame(callback) };
  }
  return { mode: "timeout", id: setTimeout(callback, 0) };
}

function refKey(tab, entityId) {
  return `${tab || ""}\u0000${entityId}`;
}

function cancelFrame(handle) {
  if (!handle) return;
  if (handle.mode === "raf" && typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function") {
    window.cancelAnimationFrame(handle.id);
  } else if (handle.mode === "timeout") {
    clearTimeout(handle.id);
  }
}

function focusTargetField(node, field) {
  if (!node || !field) return;
  const exactField = node.querySelector?.(`[data-field="${field}"]`);
  const fallbackField = field === "name" ? node.querySelector?.("input, select, textarea") : null;
  (exactField || fallbackField)?.focus?.();
}

export function useCatalogLocator(setActiveTab) {
  const entityRefs = useRef(new Map());
  const highlightTimer = useRef(null);
  const locateFrame = useRef(null);
  const newEntityTimer = useRef(null);
  const [highlightedEntityId, setHighlightedEntityId] = useState(null);
  const [newEntityTarget, setNewEntityTarget] = useState(null);

  const registerEntity = useCallback((tabOrEntityId, entityIdOrNode, maybeNode) => {
    const hasTab = maybeNode !== undefined;
    const tab = hasTab ? tabOrEntityId : "";
    const entityId = hasTab ? entityIdOrNode : tabOrEntityId;
    const node = hasTab ? maybeNode : entityIdOrNode;
    if (!entityId) return;
    const key = refKey(tab, entityId);
    if (node) entityRefs.current.set(key, node);
    else entityRefs.current.delete(key);
  }, []);

  const locateTarget = useCallback((target) => {
    if (!target?.entityId) return;
    setActiveTab(target.tab);
    if (locateFrame.current) cancelFrame(locateFrame.current);
    locateFrame.current = scheduleFrame(() => {
      locateFrame.current = null;
      const node = entityRefs.current.get(refKey(target.tab, target.entityId))
        || entityRefs.current.get(refKey("", target.entityId));
      node?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      focusTargetField(node, target.field);
      setHighlightedEntityId(target.entityId);
      if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
      highlightTimer.current = window.setTimeout(() => setHighlightedEntityId(null), 1600);
    });
  }, [setActiveTab]);

  const markNewEntity = useCallback((target) => {
    if (!target?.entityId) return;
    setNewEntityTarget(target);
  }, []);

  useEffect(() => {
    if (newEntityTimer.current) {
      window.clearTimeout(newEntityTimer.current);
      newEntityTimer.current = null;
    }
    if (!newEntityTarget) return undefined;
    const frame = scheduleFrame(() => {
      const node = entityRefs.current.get(refKey(newEntityTarget.tab, newEntityTarget.entityId));
      node?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      focusTargetField(node, newEntityTarget.field);
      node?.classList?.add("catalog-record-enter");
      newEntityTimer.current = window.setTimeout(() => {
        newEntityTimer.current = null;
        node?.classList?.remove("catalog-record-enter");
        setNewEntityTarget(null);
      }, 400);
    });
    return () => {
      cancelFrame(frame);
      if (newEntityTimer.current) {
        window.clearTimeout(newEntityTimer.current);
        newEntityTimer.current = null;
      }
    };
  }, [newEntityTarget]);

  useEffect(() => () => {
    if (locateFrame.current) cancelFrame(locateFrame.current);
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    if (newEntityTimer.current) window.clearTimeout(newEntityTimer.current);
  }, []);

  return { registerEntity, locateTarget, highlightedEntityId, markNewEntity };
}
