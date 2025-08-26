-- Add anatomy-specific transition questions to bridge from anatomy selection to detailed questions
INSERT INTO easy_chat_questions (id, question_text, category, is_root, response_leads_to) VALUES
('anatomy_head_start', 'What brings you to discuss your head or head area today?', 'anatomy', false, '{
  "pain": "head_pain_details",
  "headaches": "headache_type",
  "dizziness": "dizziness_details", 
  "vision_issues": "vision_concerns",
  "hearing_issues": "hearing_concerns",
  "sinus_issues": "sinus_problems",
  "other_issues": "other_specify"
}'),

('anatomy_chest_start', 'What brings you to discuss your chest area today?', 'anatomy', false, '{
  "pain": "chest_pain_type",
  "breathing": "breathing_difficulty",
  "heart_concerns": "heart_symptoms",
  "cough": "cough_details",
  "tightness": "chest_tightness",
  "other_issues": "other_specify"
}'),

('anatomy_abdomen_start', 'What brings you to discuss your abdomen or stomach area today?', 'anatomy', false, '{
  "pain": "abdominal_pain_type",
  "digestive": "digestive_concerns",
  "nausea": "nausea_details",
  "bloating": "bloating_concerns",
  "bowel_changes": "bowel_issues",
  "other_issues": "other_specify"
}'),

('anatomy_back_start', 'What brings you to discuss your back today?', 'anatomy', false, '{
  "pain": "back_pain_type",
  "stiffness": "back_stiffness",
  "muscle_tension": "muscle_issues",
  "mobility": "mobility_concerns",
  "injury": "injury_details",
  "other_issues": "other_specify"
}'),

('anatomy_arms_start', 'What brings you to discuss your arms today?', 'anatomy', false, '{
  "pain": "arm_pain_details",
  "weakness": "arm_weakness",
  "numbness": "numbness_tingling",
  "mobility": "arm_mobility",
  "injury": "arm_injury",
  "other_issues": "other_specify"
}'),

('anatomy_legs_start', 'What brings you to discuss your legs today?', 'anatomy', false, '{
  "pain": "leg_pain_details",
  "weakness": "leg_weakness", 
  "swelling": "leg_swelling",
  "mobility": "leg_mobility",
  "circulation": "circulation_issues",
  "other_issues": "other_specify"
}'),

('anatomy_neck_start', 'What brings you to discuss your neck today?', 'anatomy', false, '{
  "pain": "neck_pain_details",
  "stiffness": "neck_stiffness",
  "headaches": "neck_headaches",
  "mobility": "neck_mobility",
  "muscle_tension": "neck_tension",
  "other_issues": "other_specify"
}');