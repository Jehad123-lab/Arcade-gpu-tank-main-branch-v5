interface EnginePackItem<T> {
  name: string;
  ext: string;
  object: T;
  blobUrl: string;
};

class EnginePackItemList<T> extends Array<EnginePackItem<T>> {
  constructor() {
    super();
  }

  get(name: string): T {
    const item = this.find(i => i.name == name);
    if (!item) {
      throw new Error('EnginePack::EnginePackItemList::get(): item not found !');
    }

    return item.object;
  }

  findWithRegex(regex: RegExp): T {
    const item = this.find(i => i.name.search(regex) != -1);
    if (!item) {
      throw new Error('EnginePack::EnginePackItemList::get(): item not found !');
    }

    return item.object;
  }
}

export type { EnginePackItem };
export { EnginePackItemList };