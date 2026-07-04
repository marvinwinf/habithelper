import { fireEvent, render, screen } from '@testing-library/react-native';

import EditCategoryScreen from '../edit';
import { getCategory, updateCategory } from '../../../../src/data/repositories/categoryRepository';

jest.mock('../../../../src/data/db/client', () => ({ db: {} }));
jest.mock('../../../../src/data/repositories/categoryRepository', () => ({
  getCategory: jest.fn(),
  updateCategory: jest.fn().mockResolvedValue(undefined),
}));

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'category-1' }),
  useRouter: () => ({ back: mockBack }),
}));

const existingCategory = {
  id: 'category-1',
  name: 'Sport',
  baseColor: '#8FBFA0',
  createdAt: 'x',
  updatedAt: 'x',
};

describe('EditCategoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCategory as jest.Mock).mockResolvedValue(existingCategory);
  });

  it('pre-fills the form with the existing category once loaded', async () => {
    await render(<EditCategoryScreen />);

    expect(await screen.findByTestId('edit-category-form')).toBeTruthy();
    expect(screen.getByTestId('category-form-name-input').props.value).toBe('Sport');
    expect(getCategory).toHaveBeenCalledWith({}, 'category-1');
  });

  it('updates the category and navigates back on save', async () => {
    await render(<EditCategoryScreen />);
    await screen.findByTestId('edit-category-form');

    await fireEvent.changeText(screen.getByTestId('category-form-name-input'), 'Fitness');
    await fireEvent.press(screen.getByTestId('category-form-save'));

    expect(updateCategory).toHaveBeenCalledWith(
      {},
      'category-1',
      expect.objectContaining({ name: 'Fitness' }),
    );
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
