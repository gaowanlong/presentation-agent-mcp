export type ResearchContext = {
  topic: string;
  sections: {
    background: string[];
    insights: string[];
    architecture: string;
    roadmap: string;
    implications: string[];
  };
  constraints?: { audience?: string; style?: string; };
};