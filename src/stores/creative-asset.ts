import { defineStore } from "pinia";
import { ref } from "vue";
import {
  creativeAssetService,
  type CreateCreativeAssetInput,
  type CreateCreativeAssetLinkInput,
  type CreativeAsset,
  type CreativeAssetLink,
} from "../services/creative-asset.service";

export type { CreativeAsset, CreativeAssetLink } from "../services/creative-asset.service";

export const useCreativeAssetStore = defineStore("creative-asset", () => {
  const domainAssets = ref<CreativeAsset[]>([]);
  const domainAssetLinks = ref<CreativeAssetLink[]>([]);
  const domainAssetError = ref<string | null>(null);
  const domainAssetRunning = ref(false);

  const createDomainAsset = async (input: CreateCreativeAssetInput) => {
    return creativeAssetService.createCreativeAsset(input);
  };

  const createDomainAssetLink = async (input: CreateCreativeAssetLinkInput) => {
    return creativeAssetService.createCreativeAssetLink(input);
  };

  const runDomainAssetDraft = async (input: {
    projectId?: string | null;
    sourceAssetId?: number | null;
    sourceTaskId?: number | null;
    characterTitle: string;
    sceneTitle: string;
    propTitle: string;
    storyboardTitle: string;
    novelChapterTitle: string;
    scriptSceneTitle: string;
    bibleTitle: string;
  }) => {
    domainAssetError.value = null;
    domainAssetRunning.value = true;
    domainAssets.value = [];
    domainAssetLinks.value = [];

    try {
      const [
        character,
        scene,
        prop,
        storyboard,
        novelChapter,
        scriptScene,
        bible,
        styleBible,
        worldBible,
      ] = await Promise.all([
        createDomainAsset({
          projectId: input.projectId,
          assetType: "character",
          title: input.characterTitle,
          content: "Character draft asset.",
          metadataJson: JSON.stringify({
            sourceAssetId: input.sourceAssetId ?? null,
            sourceTaskId: input.sourceTaskId ?? null,
          }),
          status: "ready",
        }),
        createDomainAsset({
          projectId: input.projectId,
          assetType: "scene",
          title: input.sceneTitle,
          content: "Scene draft asset.",
          metadataJson: JSON.stringify({
            sourceAssetId: input.sourceAssetId ?? null,
          }),
          status: "ready",
        }),
        createDomainAsset({
          projectId: input.projectId,
          assetType: "prop",
          title: input.propTitle,
          content: "Prop draft asset.",
          status: "ready",
        }),
        createDomainAsset({
          projectId: input.projectId,
          assetType: "storyboard",
          title: input.storyboardTitle,
          content: "Storyboard draft asset.",
          status: "ready",
        }),
        createDomainAsset({
          projectId: input.projectId,
          assetType: "novel_chapter",
          title: input.novelChapterTitle,
          content: "Novel chapter draft asset.",
          status: "ready",
        }),
        createDomainAsset({
          projectId: input.projectId,
          assetType: "script_scene",
          title: input.scriptSceneTitle,
          content: "Script scene draft asset.",
          status: "ready",
        }),
        createDomainAsset({
          projectId: input.projectId,
          assetType: "bible",
          title: input.bibleTitle,
          content: "Bible draft asset.",
          status: "ready",
        }),
        createDomainAsset({
          projectId: input.projectId,
          assetType: "style_bible",
          title: `${input.bibleTitle} Style`,
          content: "Style bible draft asset.",
          status: "ready",
        }),
        createDomainAsset({
          projectId: input.projectId,
          assetType: "world_bible",
          title: `${input.bibleTitle} World`,
          content: "World bible draft asset.",
          status: "ready",
        }),
      ]);

      const links = await Promise.all([
        createDomainAssetLink({
          sourceAssetId: storyboard.id,
          targetAssetId: character.id,
          linkType: "uses_character",
        }),
        createDomainAssetLink({
          sourceAssetId: storyboard.id,
          targetAssetId: scene.id,
          linkType: "uses_scene",
        }),
        createDomainAssetLink({
          sourceAssetId: storyboard.id,
          targetAssetId: prop.id,
          linkType: "uses_prop",
        }),
        createDomainAssetLink({
          sourceAssetId: scriptScene.id,
          targetAssetId: character.id,
          linkType: "depends_on",
        }),
        createDomainAssetLink({
          sourceAssetId: novelChapter.id,
          targetAssetId: bible.id,
          linkType: "part_of",
        }),
        createDomainAssetLink({
          sourceAssetId: styleBible.id,
          targetAssetId: bible.id,
          linkType: "derived_from",
        }),
        createDomainAssetLink({
          sourceAssetId: worldBible.id,
          targetAssetId: bible.id,
          linkType: "derived_from",
        }),
      ]);

      domainAssets.value = [
        character,
        scene,
        prop,
        storyboard,
        novelChapter,
        scriptScene,
        bible,
        styleBible,
        worldBible,
      ];
      domainAssetLinks.value = links;
      return { assets: domainAssets.value, links: domainAssetLinks.value };
    } catch (error) {
      const message = error instanceof Error ? error.message : "domain asset draft failed";
      domainAssetError.value = message;
      throw error;
    } finally {
      domainAssetRunning.value = false;
    }
  };

  return {
    domainAssets,
    domainAssetLinks,
    domainAssetError,
    domainAssetRunning,
    runDomainAssetDraft,
  };
});
