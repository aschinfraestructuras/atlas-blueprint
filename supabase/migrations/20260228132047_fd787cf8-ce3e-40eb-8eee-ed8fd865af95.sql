-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE documents;
ALTER PUBLICATION supabase_realtime ADD TABLE non_conformities;
ALTER PUBLICATION supabase_realtime ADD TABLE planning_activities;
ALTER PUBLICATION supabase_realtime ADD TABLE equipment_calibrations;
ALTER PUBLICATION supabase_realtime ADD TABLE supplier_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE subcontractor_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE rfis;