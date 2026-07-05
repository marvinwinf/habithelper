import { fireEvent, render, screen } from '@testing-library/react-native';

import CreateCategoryScreen from '../create';
import { createCategory } from '../../../src/data/repositories/categoryRepository';

jest.mock('../../../src/data/db/client', () => ({ db: {} }));
jest.mock('../../../src/data/repositories/categoryRepository', () => ({
  createCategory: jest.fn().mockResolvedValue(undefined),
}));

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

describe('CreateCategoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the create category form', async () => {
    await render(<CreateCategoryScreen />);
    expect(screen.getByTestId('create-category-form')).toBeTruthy();
  });

  it('creates the category and navigates back on save', async () => {
    await render(<CreateCategoryScreen />);

    await fireEvent.changeText(screen.getByTestId('category-form-name-input'), 'Sport');
    await fireEvent.press(screen.getByTestId('category-form-save'));

    expect(createCategory).toHaveBeenCalledWith(
      {},
      { name: 'Sport', baseColor: expect.any(String), icon: null },
    );
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
