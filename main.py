import pandas as pd
import glob
import os

def combine_csv_files(input_folder: str, output_file: str) -> None:
    """
    Combines all CSV files found in the input_folder and its subdirectories
    into a single CSV file.
    """
    print(f"Searching for CSV files in {input_folder}...")
    
    # Use glob to find all CSV files recursively in the specified folder
    search_pattern = os.path.join(input_folder, '**', '*.csv')
    csv_files = glob.glob(search_pattern, recursive=True)
    
    if not csv_files:
        print("No CSV files found.")
        return
        
    print(f"Found {len(csv_files)} CSV files. Combining them now...")
    
    # Read each CSV file and store the DataFrame in a list
    dataframes = []
    for file in csv_files:
        try:
            df = pd.read_csv(file)
            dataframes.append(df)
        except Exception as e:
            print(f"Error reading {file}: {e}")
            
    # Concatenate all DataFrames
    if dataframes:
        combined_df = pd.concat(dataframes, ignore_index=True)
        
        # Save the combined DataFrame to the output file
        print(f"Saving combined data to {output_file}...")
        combined_df.to_csv(output_file, index=False)
        print("Successfully combined all CSV files!")
    else:
        print("No valid data could be combined.")

if __name__ == "__main__":
    # Define input folder and output file path relative to the script location
    INPUT_FOLDER = 'GHI'
    OUTPUT_FILE = 'combined_ghi.csv'
    
    combine_csv_files(INPUT_FOLDER, OUTPUT_FILE)
