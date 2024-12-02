export interface TextItem {
  id: string;
  content: string;
  order: number;
  parentId: string | null;
  children: TextItem[];
}