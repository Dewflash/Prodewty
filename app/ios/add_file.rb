require 'xcodeproj'

project_path = './Prodewty.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Find the main app target
target = project.targets.find { |t| t.name == 'Prodewty' } || project.targets.first

# Find the group corresponding to the Prodewty folder
group = project.main_group.find_subpath('Prodewty', true)

# Check if file is already added
file_path = 'JournalMediaBridge.m'
existing_ref = group.files.find { |f| f.path == file_path }

if existing_ref
  puts "File already in project"
else
  # Create a reference to the file
  file_ref = group.new_reference(file_path)
  
  # Add it to the build phase (Compile Sources)
  target.source_build_phase.add_file_reference(file_ref, true)
  
  project.save
  puts "Successfully added JournalMediaBridge.m to the Xcode project"
end
